// worker/routes/student.ts
// Student Portal API Routes

import { error, ok, typedJson } from '../lib/types';
import type { Env } from '../lib/types';
import { percentageToGrade } from '@bmi/shared';

export async function handleGetDashboard(request: Request, env: Env, userId: string): Promise<Response> {
  // Get upcoming invoices
  const { results: invoices } = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, amount, due_date, status FROM invoices WHERE student_id = ? AND status = "unpaid" ORDER BY due_date ASC'
  ).bind(userId).all();

  // Get current enrollments
  const { results: enrollments } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT e.id, c.code, c.title, c.credits, c.term, e.grade, c.id as course_id 
     FROM enrollments e 
     JOIN courses c ON e.course_id = c.id 
     WHERE e.student_id = ? AND e.status = 'enrolled'`
  ).bind(userId).all();

  // Compute total balance
  const balance = invoices.reduce((sum: number, inv: Record<string, unknown>) => sum + (inv.amount as number), 0);

  return ok({
    balance,
    upcoming_invoices: invoices,
    current_classes: enrollments,
    announcements: [
      { id: '1', title: 'Welcome to Fall 2026', date: '2026-08-15', content: 'Classes begin September 1st.' },
      { id: '2', title: 'Course Registration Open', date: '2026-08-20', content: 'Enroll in your classes before the deadline.' }
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

  try {
    // Generate invoice for 1000 per class (mock logic)
    const invoiceId = crypto.randomUUID();
    
    // Enroll the student
    await env.PLATFORM_CONTEXT!.db.prepare(
      'INSERT INTO enrollments (id, student_id, course_id, status) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), userId, body.course_id, 'enrolled').run();
    
    // Create an invoice
    await env.PLATFORM_CONTEXT!.db.prepare(
      'INSERT INTO invoices (id, student_id, amount, status, due_date) VALUES (?, ?, ?, ?, ?)'
    ).bind(invoiceId, userId, 1000, 'unpaid', '2026-09-15').run();

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

  // For now, simulate successful payment and mark invoice as paid
  await env.PLATFORM_CONTEXT!.db.prepare(
    'UPDATE invoices SET status = "paid" WHERE id = ? AND student_id = ?'
  ).bind(invoiceId, userId).run();

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
