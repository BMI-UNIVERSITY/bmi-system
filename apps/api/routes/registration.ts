import { Env, ok, error, typedJson } from '../lib/types';
import { ExecutionContext } from '@cloudflare/workers-types';
import { sendEmail, buildEmailLayout } from '../lib/email';
import { generateRegNo } from '../lib/reg_number';
import { enqueueProvisioningJobs } from '../lib/provisioning';

export type RegStep = 'personal_details' | 'address' | 'programme' | 'modules' | 'fees' | 'confirm';

export interface RegistrationData {
  personal_details?: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    nationality: string;
    phone: string;
  };
  address?: {
    current_address: string;
    city: string;
    state: string;
    country: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
  };
  programme?: {
    programme_id: string;
    programme_name: string;
    level: string;
    study_mode: 'full_time' | 'part_time' | 'distance';
  };
  modules?: {
    selected_course_ids: string[];
    total_credits: number;
  };
  fees?: {
    accepted_fee_structure: boolean;
    payment_method: string;
    scholarship_claimed: boolean;
    scholarship_details?: string;
  };
  confirm?: {
    accepted_terms: boolean;
    data_accuracy_confirmed: boolean;
    signed_name: string;
    signed_date: string;
  };
}

const STEP_ORDER: RegStep[] = ['personal_details', 'address', 'programme', 'modules', 'fees', 'confirm'];

function validateStep(step: RegStep, data: Record<string, unknown>): string | null {
  switch (step) {
    case 'personal_details':
      if (!data.first_name) return 'First name is required';
      if (!data.last_name) return 'Last name is required';
      if (!data.date_of_birth) return 'Date of birth is required';
      if (!data.gender) return 'Gender is required';
      if (!data.nationality) return 'Nationality is required';
      return null;
    case 'address':
      if (!data.current_address) return 'Current address is required';
      if (!data.emergency_contact_name) return 'Emergency contact name is required';
      if (!data.emergency_contact_phone) return 'Emergency contact phone is required';
      return null;
    case 'programme':
      if (!data.programme_id) return 'Programme selection is required';
      if (!data.study_mode) return 'Study mode is required';
      return null;
    case 'modules':
      if (!data.selected_course_ids || !Array.isArray(data.selected_course_ids) || data.selected_course_ids.length === 0) {
        return 'At least one module must be selected';
      }
      return null;
    case 'fees':
      if (!data.accepted_fee_structure) return 'You must accept the fee structure';
      if (!data.payment_method) return 'Payment method is required';
      return null;
    case 'confirm':
      if (!data.accepted_terms) return 'You must accept the terms and conditions';
      if (!data.data_accuracy_confirmed) return 'You must confirm data accuracy';
      if (!data.signed_name) return 'Digital signature is required';
      return null;
    default:
      return null;
  }
}

export async function handleSaveRegistrationStep(req: Request, env: Env, userId: string, step: string): Promise<Response> {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  try {
    if (!STEP_ORDER.includes(step as RegStep)) {
      return error(`Invalid registration step: ${step}`, 400);
    }

    const body = await typedJson<Record<string, unknown>>(req);
    const validationError = validateStep(step as RegStep, body);
    if (validationError) return error(validationError, 400);

    const existing = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT value FROM metadata WHERE id = ? AND key = 'registration_data'`
    ).bind(userId).first<{ value: string }>();

    const currentData: RegistrationData = existing ? JSON.parse(existing.value) : {};
    (currentData as Record<string, unknown>)[step] = body;

    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO metadata (id, key, value) VALUES (?, 'registration_data', ?) ON CONFLICT(id, key) DO UPDATE SET value=excluded.value`
    ).bind(userId, JSON.stringify(currentData)).run();

    return ok({
      message: `Step ${step} saved successfully`,
      completed_steps: Object.keys(currentData).filter(k => STEP_ORDER.includes(k as RegStep)),
      all_completed: STEP_ORDER.every(s => currentData[s] !== undefined),
    });
  } catch {
    return error('Failed to save registration step', 500);
  }
}

export async function handleGetRegistrationStatus(req: Request, env: Env, userId: string): Promise<Response> {
  try {
    const existing = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT value FROM metadata WHERE id = ? AND key = 'registration_data'`
    ).bind(userId).first<{ value: string }>();

    const currentData: RegistrationData = existing ? JSON.parse(existing.value) : {};
    const completedSteps = STEP_ORDER.filter(s => currentData[s] !== undefined);
    const nextStep = STEP_ORDER.find(s => currentData[s] === undefined) || null;

    return ok({
      completed_steps: completedSteps,
      next_step: nextStep,
      current_data: currentData,
      registration_complete: nextStep === null,
    });
  } catch {
    return error('Failed to get registration status', 500);
  }
}

export async function handleCompleteRegistration(req: Request, env: Env, userId: string, ctx?: ExecutionContext): Promise<Response> {
  try {
    const existing = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT value FROM metadata WHERE id = ? AND key = 'registration_data'`
    ).bind(userId).first<{ value: string }>();

    if (!existing) return error('No registration data found', 400);

    const currentData: RegistrationData = JSON.parse(existing.value);
    const missingStep = STEP_ORDER.find(s => currentData[s] === undefined);
    if (missingStep) return error(`Step ${missingStep} is not yet completed`, 400);

    const db = env.PLATFORM_CONTEXT!.db;
    
    // Fetch user details for provisioning and reg_no generation
    const userRow = await db.prepare(
      `SELECT u.email, u.first_name, u.last_name, s.reg_no, p.uid
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN persons p ON u.person_id = p.id
       WHERE u.id = ?`
    ).bind(userId).first<{ email: string; first_name: string; last_name: string; reg_no: string | null; uid: string | null }>();
    
    if (!userRow) return error('User not found', 404);
    
    const uid = userRow.uid;
    if (!uid) return error('User lacks UID. Please contact support.', 400);

    const now = new Date().toISOString();
    let programmeId = currentData.programme?.programme_id;
    let finalRegNo = userRow.reg_no;

    await db.transaction(async (tx) => {
      // 1. Update students programme text
      await tx.prepare(
        `UPDATE students SET programme = ?, updated_at = ? WHERE user_id = ?`
      ).bind(currentData.programme?.programme_name || '', now, userId).run();

      // 2. Link student_programmes and generate Reg No if needed
      if (programmeId) {
        const year = new Date().getUTCFullYear();
        const rowId = crypto.randomUUID().replace(/-/g, '');
        
        await tx.prepare(
          `INSERT OR IGNORE INTO student_programmes
             (id, uid, programme_id, admission_year, enrollment_date, status, current_flag, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)`
        ).bind(rowId, uid, programmeId, year, now.split('T')[0], now, now).run();
        
        if (!finalRegNo || finalRegNo.startsWith('PENDING')) {
          const progInfo = await tx.prepare(
            `SELECT code, level FROM programs WHERE id = ?`
          ).bind(programmeId).first<{ code: string; level: string }>();
          
          if (progInfo) {
            finalRegNo = await generateRegNo(tx, programmeId, progInfo.code, year, progInfo.level);
            await tx.prepare(
              `UPDATE students SET reg_no = ?, updated_at = ? WHERE user_id = ?`
            ).bind(finalRegNo, now, userId).run();
            await tx.prepare(
              `UPDATE student_programmes SET registration_number = ?, updated_at = ? WHERE uid = ? AND current_flag = 1`
            ).bind(finalRegNo, now, uid).run();
          }
        }
      }

      // 3. Process Enrollments
      const courses = currentData.modules?.selected_course_ids || [];
      for (const courseId of courses) {
        await tx.prepare(
          `INSERT OR IGNORE INTO enrollments (id, student_id, course_id, status) VALUES (?, ?, ?, 'enrolled')`
        ).bind(crypto.randomUUID(), userId, courseId).run();
      }

      // 4. Update metadata to show completion
      await tx.prepare(
        `UPDATE metadata SET value = ? WHERE id = ? AND key = 'registration_data'`
      ).bind(JSON.stringify({ ...currentData, _completed_at: now }), userId).run();
    });

    // 5. Trigger Provisioning Jobs (Finance, Email, ID Card, LMS)
    await enqueueProvisioningJobs(db, uid);

    if (userRow.email) {
      ctx?.waitUntil(sendEmail(env, {
        to: userRow.email,
        subject: 'BMI University — Registration Complete',
        html: buildEmailLayout('Registration Complete', `
          <h2 style="color: #0f172a;">Congratulations, ${userRow.first_name}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            Your registration at BMI University has been successfully completed.
          </p>
          <div style="background:#f8fafc;border-left:4px solid #d4af37;padding:16px;margin:20px 0;border-radius:4px;">
            <p><strong>Registration Number:</strong> ${finalRegNo || 'Pending'}</p>
            <p><strong>Programme:</strong> ${currentData.programme?.programme_name || 'N/A'}</p>
          </div>
          <p style="color: #475569; line-height: 1.6;">
            Our systems are currently provisioning your student email, ID card, and enrolling you into the LMS. You will receive separate emails as these become available.
          </p>
          <p style="color: #475569; line-height: 1.6;">
            You can now access your courses, view your timetable, and begin your academic journey.
          </p>
        `),
      }).catch(e => console.error('[registration] Welcome email failed:', e)));
    }

    return ok({ message: 'Registration completed successfully' });
  } catch (e: unknown) {
    console.error('Failed to complete registration:', e);
    return error('Failed to complete registration', 500);
  }
}

export async function handleGetAvailableModules(req: Request, env: Env, userId: string): Promise<Response> {
  try {
    const progMeta = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT value FROM metadata WHERE id = ? AND key = 'registration_data'`
    ).bind(userId).first<{ value: string }>();

    let programmeId: string | null = null;
    if (progMeta) {
      const data: RegistrationData = JSON.parse(progMeta.value);
      programmeId = data.programme?.programme_id || null;
    }

    const { results } = await env.PLATFORM_CONTEXT!.db.prepare(
      programmeId
        ? `SELECT c.id, c.code, c.name, c.credits, c.level FROM courses c JOIN programmes p ON c.programme_id = p.id WHERE p.id = ? ORDER BY c.code`
        : `SELECT c.id, c.code, c.name, c.credits, c.level FROM courses c ORDER BY c.code`
    ).bind(...(programmeId ? [programmeId] : [])).all();

    return ok(results || []);
  } catch {
    return error('Failed to get modules', 500);
  }
}
