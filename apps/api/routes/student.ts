// worker/routes/student.ts
// Student Portal API Routes

import { error, ok, typedJson } from '../lib/types';
import type { Env } from '../lib/types';
import { percentageToGrade } from '@bmi/shared';

export async function handleGetDashboard(request: Request, env: Env, userId: string): Promise<Response> {
  const { results: invoices } = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, amount, due_date, status FROM invoices WHERE student_id = ? ORDER BY due_date DESC'
  ).bind(userId).all();

  const { results: enrollments } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT e.id, c.code, c.title, c.credits, c.term, e.grade, c.id as course_id 
     FROM enrollments e 
     JOIN courses c ON e.course_id = c.id 
     WHERE e.student_id = ? AND e.status = 'enrolled'`
  ).bind(userId).all();

  const balance = invoices.filter((i: Record<string, unknown>) => i.status === 'unpaid').reduce((sum: number, inv: Record<string, unknown>) => sum + (inv.amount as number), 0);

  const { results: activeHolds } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT hold_type, reason FROM student_holds WHERE student_id = ? AND is_active = 1 ORDER BY created_at ASC`
  ).bind(userId).all();

  const unpaidCount = invoices.filter((i: Record<string, unknown>) => i.status === 'unpaid').length;

  return ok({
    balance,
    unpaid_invoices: unpaidCount,
    upcoming_invoices: invoices.filter((i: Record<string, unknown>) => i.status === 'unpaid').slice(0, 5),
    current_classes: enrollments,
    registration_holds: activeHolds,
    has_registration_blocks: activeHolds.length > 0,
    announcements: [
      { id: '1', title: 'Welcome to the New Academic Year', date: new Date().toISOString().split('T')[0], content: 'Complete your onboarding steps to register for courses.' },
    ]
  });
}

export async function handleGetCourses(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const term = url.searchParams.get('term') || 'Fall 2026';
  
  const { results: courses } = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, code, title, description, credits, term, capacity FROM courses WHERE term = ? ORDER BY code ASC'
  ).bind(term).all();
  
  return ok(courses);
}

export async function handleEnroll(request: Request, env: Env, userId: string): Promise<Response> {
  let body: { course_id: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON');
  }

  if (!body.course_id) return error('course_id is required');

  const activeHold = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT hold_type, reason FROM student_holds WHERE student_id = ? AND is_active = 1 LIMIT 1`
  ).bind(userId).first<{ hold_type: string; reason: string }>();

  if (activeHold) {
    return error(`Cannot enroll: ${activeHold.reason} (${activeHold.hold_type} hold active).`, 403);
  }

  try {
    await env.PLATFORM_CONTEXT!.db.prepare(
      'INSERT INTO enrollments (id, student_id, course_id, status) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), userId, body.course_id, 'enrolled').run();

    return ok({ success: true, message: 'Enrolled successfully' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE constraint failed')) {
      return error('Already enrolled in this course', 400);
    }
    return error('Enrollment failed', 500);
  }
}

export async function handleGetFinances(request: Request, env: Env, userId: string): Promise<Response> {
  const { results: invoices } = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, amount, due_date, status, created_at FROM invoices WHERE student_id = ? ORDER BY due_date DESC'
  ).bind(userId).all();
  
  const balance = invoices.filter((i: Record<string, unknown>) => i.status === 'unpaid').reduce((sum: number, inv: Record<string, unknown>) => sum + (inv.amount as number), 0);

  return ok({
    balance,
    invoices
  });
}

export async function handlePayInvoice(request: Request, env: Env, userId: string, invoiceId: string): Promise<Response> {
  const invoice = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id, amount, status FROM invoices WHERE id = ? AND student_id = ?').bind(invoiceId, userId).first();
  if (!invoice) return error('Invoice not found', 404);
  if (invoice.status === 'paid') return error('Invoice is already paid', 400);

  // Create payment intent
  const paymentIntent = await env.PLATFORM_CONTEXT!.payment.createPaymentIntent({
    amount: invoice.amount,
    currency: 'USD',
    description: `Invoice ${invoice.id}`,
    metadata: { userId, invoiceId }
  });

  await env.PLATFORM_CONTEXT!.db.prepare(
    'UPDATE invoices SET status = "paid" WHERE id = ? AND student_id = ?'
  ).bind(invoiceId, userId).run();

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE student_holds SET is_active = 0, resolved_at = datetime('now')
     WHERE student_id = ? AND hold_type = 'payment' AND is_active = 1`
  ).bind(userId).run();

  return ok({ 
    success: true, 
    message: 'Payment successful', 
    paymentIntentId: paymentIntent.id 
  });
}

export async function handleDropCourse(request: Request, env: Env, userId: string, courseId: string): Promise<Response> {
  const result = await env.PLATFORM_CONTEXT!.db.prepare(
    'UPDATE enrollments SET status = "dropped" WHERE course_id = ? AND student_id = ? AND status = "enrolled"'
  ).bind(courseId, userId).run();
  
  if (result.meta.changes === 0) {
    return error('Course not found or not enrolled', 400);
  }
  return ok({ success: true, message: 'Course dropped successfully' });
}

export async function handleGetTranscript(request: Request, env: Env, userId: string): Promise<Response> {
  const { results: classes } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT c.code, c.title, c.credits, c.term, e.id as enrollment_id, e.status,
            (SELECT AVG(g.score * 100.0 / NULLIF(g.max_score, 0))
               FROM grades g WHERE g.enrollment_id = e.id AND g.max_score > 0) as avg_pct
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     WHERE e.student_id = ? AND e.status != 'waitlisted'
     ORDER BY c.term DESC, c.code ASC`
  ).bind(userId).all();
  
  let totalPoints = 0;
  let totalCredits = 0;
  
  interface CourseRow { code: string; title: string; credits: number; term: string; enrollment_id: string; status: string; avg_pct: number | null }
  const withGrades = (classes as CourseRow[]).map((c) => {
    let letter_grade = 'N/A';
    if (c.avg_pct !== null) {
      const gradeInfo = percentageToGrade(c.avg_pct);
      letter_grade = gradeInfo.letter_grade;
      totalPoints += gradeInfo.grade_point * c.credits;
      totalCredits += c.credits;
    }
    return { ...c, grade: letter_grade };
  });
  
  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : null;
  
  return ok({ classes: withGrades, gpa });
}

export async function handleGetSettings(request: Request, env: Env, userId: string): Promise<Response> {
  let settings = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT directory_release, communications_opt_in FROM student_settings WHERE student_id = ?'
  ).bind(userId).first();
  
  if (!settings) {
    // Default settings
    settings = { directory_release: 1, communications_opt_in: 1 };
  }
  
  return ok(settings);
}

export async function handleUpdateSettings(request: Request, env: Env, userId: string): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await typedJson<Record<string, unknown>>(request);
  } catch {
    return error('Invalid JSON');
  }
  
  const dirRelease = body.directory_release ? 1 : 0;
  const commOptIn = body.communications_opt_in ? 1 : 0;
  
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO student_settings (student_id, directory_release, communications_opt_in, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(student_id) DO UPDATE SET 
       directory_release = excluded.directory_release,
       communications_opt_in = excluded.communications_opt_in,
       updated_at = excluded.updated_at`
  ).bind(userId, dirRelease, commOptIn).run();
  
  return ok({ success: true, message: 'Settings updated' });
}

export async function handleGetTickets(request: Request, env: Env, userId: string): Promise<Response> {
  const { results: tickets } = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, subject, status, created_at FROM support_tickets WHERE student_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();
  return ok(tickets);
}

export async function handleCreateTicket(request: Request, env: Env, userId: string): Promise<Response> {
  let body: { subject: string, description: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON');
  }
  
  if (!body.subject || !body.description) {
    return error('Subject and description are required');
  }
  
  const ticketId = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    'INSERT INTO support_tickets (id, student_id, subject, description) VALUES (?, ?, ?, ?)'
  ).bind(ticketId, userId, body.subject, body.description).run();
  
  return ok({ success: true, message: 'Support ticket created successfully', ticket_id: ticketId });
}
