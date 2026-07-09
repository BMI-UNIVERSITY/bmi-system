import { Env, ok, error, typedJson } from '../lib/types';
import { ExecutionContext } from '@cloudflare/workers-types';
import { sendEmail, buildEmailLayout } from '../lib/email';

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

function validateStep(step: RegStep, data: any): string | null {
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
    currentData[step as RegStep] = body as any;

    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO metadata (id, key, value) VALUES (?, 'registration_data', ?) ON CONFLICT(id, key) DO UPDATE SET value=excluded.value`
    ).bind(userId, JSON.stringify(currentData)).run();

    return ok({
      message: `Step ${step} saved successfully`,
      completed_steps: Object.keys(currentData).filter(k => STEP_ORDER.includes(k as RegStep)),
      all_completed: STEP_ORDER.every(s => currentData[s] !== undefined),
    });
  } catch (e: unknown) {
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
  } catch (e: unknown) {
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

    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE students SET programme = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(currentData.programme?.programme_name || '', userId).run();

    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE metadata SET value = ? WHERE id = ? AND key = 'registration_data'`
    ).bind(JSON.stringify({ ...currentData, _completed_at: new Date().toISOString() }), userId).run();

    const user = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT email, first_name FROM users WHERE id = ?`
    ).bind(userId).first<{ email: string; first_name: string }>();

    if (user) {
      ctx?.waitUntil(sendEmail(env, {
        to: user.email,
        subject: 'BMI University — Registration Complete',
        html: buildEmailLayout('Registration Complete', `
          <h2 style="color: #0f172a;">Congratulations, ${user.first_name}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            Your registration at BMI University has been successfully completed.
          </p>
          <p style="color: #475569; line-height: 1.6;">
            You can now access your courses, view your timetable, and begin your academic journey.
          </p>
        `),
      }).catch(() => {}));
    }

    return ok({ message: 'Registration completed successfully' });
  } catch (e: unknown) {
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
  } catch (e: unknown) {
    return error('Failed to get modules', 500);
  }
}
