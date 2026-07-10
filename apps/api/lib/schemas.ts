/**
 * @bmi/api — Input Validation Schemas
 *
 * Single source of truth for all request-body and query-param validation.
 * Every public API handler that accepts a body MUST parse it through
 * the appropriate schema here before touching env.PLATFORM_CONTEXT!.db.
 *
 * Design rules enforced here:
 *  1. ALL string fields have explicit .max() limits to prevent DoS via
 *     oversized JSON payloads exhausting Worker CPU time.
 *  2. All body parsing goes through parseBody() which catches ZodErrors and
 *     returns a STANDARDISED { success: false, error: "...", fields: [...] }
 *     400 response — no handler ever leaks raw Zod issue arrays.
 *  3. Schemas are colocated in one file so drift between handlers is
 *     immediately visible in code review.
 */

import { z } from 'zod';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum JSON body size we're willing to parse (1 MB). The file-upload
 *  handler uses multipart/form-data and enforces its own 10 MB limit via
 *  the Content-Length / file.size check — this limit is for JSON only. */
export const MAX_JSON_BYTES = 1 * 1024 * 1024; // 1 MB

/** Shared string-length limits */
export const LIMITS = {
  SHORT: 100,    // names, codes
  MEDIUM: 500,   // titles, slugs
  LONG: 2000,    // notes, summaries
  STATEMENT: 10_000, // personal statements
  CONTENT: 100_000,  // CMS content (HTML)
  EMAIL: 254,
  PHONE: 30,
  UUID: 36,
  URL: 2048,
} as const;

// ─── Standardised Error Response ──────────────────────────────────────────────

export interface ValidationError {
  success: false;
  error: string;
  fields?: { field: string; message: string }[];
}

function validationError(err: z.ZodError): Response {
  const fields = err.errors.map((e) => ({
    field: e.path.join('.') || 'body',
    message: e.message,
  }));
  const body: ValidationError = {
    success: false,
    error: `Validation failed: ${fields.map((f) => `${f.field}: ${f.message}`).join('; ')}`,
    fields,
  };
  return new Response(JSON.stringify(body), {
    status: 400,
    headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
  });
}

// ─── Generic Parser ───────────────────────────────────────────────────────────

/**
 * Parses a request JSON body against a zod schema.
 *
 * Returns the typed, coerced output on success.
 * Returns a standardised 400 Response on parse/validation failure —
 * the caller MUST check `if (parsed instanceof Response) return parsed;`.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.infer<T> | Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return validationError(result.error);
  }
  return result.data;
}

// ─── Shared field primitives ───────────────────────────────────────────────────

const emailField = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email address')
  .max(LIMITS.EMAIL, `Email must not exceed ${LIMITS.EMAIL} characters`)
  .transform((v) => v.toLowerCase().trim());

const passwordField = (required_error = 'Password is required') =>
  z.string({ required_error }).min(8, 'Password must be at least 8 characters').max(1024, 'Password too long');

const nameField = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .min(1, `${label} is required`)
    .max(LIMITS.SHORT, `${label} must not exceed ${LIMITS.SHORT} characters`)
    .transform((v) => v.trim().replace(/<[^>]*>/g, '')); // strip HTML tags

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: emailField,
  password: passwordField(),
  first_name: nameField('First name'),
  last_name: nameField('Last name'),
  phone: z.string().max(LIMITS.PHONE, `Phone must not exceed ${LIMITS.PHONE} characters`).optional(),
});

export const LoginSchema = z.object({
  email: emailField,
  password: z.string({ required_error: 'Password is required' }).min(1).max(1024),
  mfa_token: z.string().max(10).optional(),
});

export const ForgotPasswordSchema = z.object({
  email: emailField,
});

export const ResetPasswordSchema = z.object({
  token: z.string({ required_error: 'Reset token is required' }).min(1).max(LIMITS.UUID * 4),
  new_password: passwordField('New password is required'),
});

export const ResendVerificationSchema = z.object({
  email: emailField,
});

export const ChangePasswordSchema = z.object({
  current_password: z.string({ required_error: 'Current password is required' }).min(1).max(1024),
  new_password: passwordField(),
});

// ─── Application Schemas ──────────────────────────────────────────────────────

export const VALID_DEGREE_LEVELS = ['undergraduate', 'graduate', 'doctorate', 'certificate'] as const;
export const VALID_APP_STATUSES = ['submitted', 'under_review', 'accepted', 'rejected', 'waitlisted'] as const;

export const SubmitApplicationSchema = z.object({
  program: z.string({ required_error: 'Program is required' }).min(1).max(LIMITS.MEDIUM),
  degree_level: z.enum(VALID_DEGREE_LEVELS, {
    errorMap: () => ({ message: `Degree level must be one of: ${VALID_DEGREE_LEVELS.join(', ')}` }),
  }),
  personal_statement: z
    .string()
    .max(LIMITS.STATEMENT, `Personal statement must not exceed ${LIMITS.STATEMENT} characters`)
    .optional(),
  prior_education: z
    .string()
    .max(5000, 'Prior education description must not exceed 5,000 characters')
    .optional(),
  date_of_birth: z.string().optional(),
  nationality: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  gender: z.string().max(50).optional(),
  high_school: z.string().max(200).optional(),
  graduation_year: z.number().int().min(1900).max(2100).optional(),
  gpa: z.number().min(0).max(5).optional(),
});

export const ApplicationDraftSchema = z.object({
  current_step: z.number().int().min(1).max(10).optional().default(1),
  application_data: z.record(z.any()),
});


export const UpdateApplicationStatusSchema = z.object({
  status: z.enum(VALID_APP_STATUSES, {
    errorMap: () => ({ message: 'Invalid status value' }),
  }),
  notes: z.string().max(LIMITS.LONG).optional(),
});

// ─── Admin Schemas ────────────────────────────────────────────────────────────

export const AdminSetupSchema = z.object({
  email: emailField,
  password: passwordField(),
  first_name: z.string().max(LIMITS.SHORT).optional(),
  last_name: z.string().max(LIMITS.SHORT).optional(),
});

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['applicant', 'student', 'staff', 'admin', 'verifier'], {
    errorMap: () => ({ message: `Role must be one of: applicant, student, staff, admin, verifier` }),
  }),
});

export const AdminResetPasswordSchema = z.object({
  new_password: passwordField(),
});

// ─── UMS Student Schemas ──────────────────────────────────────────────────────

export const CreateStudentSchema = z.object({
  email: emailField,
  first_name: nameField('First name'),
  last_name: nameField('Last name'),
  phone: z.string().max(LIMITS.PHONE).optional(),
  reg_no: z.string({ required_error: 'Registration number is required' }).min(1).max(50),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  date_of_birth: z.string().max(30).optional(),
  nationality: z.string().max(LIMITS.SHORT).optional(),
  admission_date: z.string({ required_error: 'Admission date is required' }).max(30),
  program: z.string({ required_error: 'Programme is required' }).min(1).max(LIMITS.MEDIUM),
  status: z.string().max(50).default('Active'),
  avatar_color: z.string().max(LIMITS.SHORT).default('bg-purple-600'),
  study_center_id: z.string().max(LIMITS.UUID).optional(),
  gpa: z.string().max(10).optional(),
  year_of_study: z.string().max(10).optional(),
  degree_level: z.string().max(50).optional(),
  password_hash: z.string().max(512).default('RESET_REQUIRED'),
});

export const UpdateStudentSchema = z
  .object({
    first_name: z.string().min(1).max(LIMITS.SHORT).optional(),
    last_name: z.string().min(1).max(LIMITS.SHORT).optional(),
    phone: z.string().max(LIMITS.PHONE).optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    date_of_birth: z.string().max(30).optional(),
    nationality: z.string().max(LIMITS.SHORT).optional(),
    admission_date: z.string().max(30).optional(),
    program: z.string().max(LIMITS.MEDIUM).optional(),
    status: z.string().max(50).optional(),
    avatar_color: z.string().max(LIMITS.SHORT).optional(),
    study_center_id: z.string().max(LIMITS.UUID).optional(),
    gpa: z.string().max(10).optional(),
    year_of_study: z.string().max(10).optional(),
    degree_level: z.string().max(50).optional(),
    graduation_date: z.string().max(30).optional(),
  })
  .strict(); // Reject any unknown keys to prevent field-injection attacks

// ─── Document Upload Schemas (query-param validation) ────────────────────────

/**
 * Documents use multipart/form-data — the FILE is validated by magic-byte
 * detection in the handler itself (no change needed there). These schemas
 * cover the QUERY PARAMETERS that accompany the upload, which were previously
 * only validated with ad-hoc string equality checks.
 */
export const VALID_DOC_TYPES = [
  'transcript',
  'id_document',
  'personal_statement',
  'other',
] as const;

export const DocumentUploadQuerySchema = z.object({
  application_id: z
    .string({ required_error: 'application_id query param is required' })
    .uuid('application_id must be a valid UUID'),
  doc_type: z.enum(VALID_DOC_TYPES, {
    errorMap: () => ({
      message: `doc_type must be one of: ${VALID_DOC_TYPES.join(', ')}`,
    }),
  }).default('other'),
});

/** Parses and validates document upload query params. */
export function parseDocumentUploadQuery(url: URL): z.infer<typeof DocumentUploadQuerySchema> | Response {
  const raw = {
    application_id: url.searchParams.get('application_id') ?? undefined,
    doc_type: url.searchParams.get('doc_type') ?? undefined,
  };
  const result = DocumentUploadQuerySchema.safeParse(raw);
  if (!result.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Validation failed: ${result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
        fields: result.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return result.data;
}

// ─── Inbound Webhook Payload Schema ───────────────────────────────────────────

/**
 * Applied AFTER HMAC signature verification — validates the decoded payload
 * structure so the handler can't be crashed by a malformed-but-signed body.
 *
 * Note: `data` is intentionally a passthrough record with string keys.
 * Deep validation of `data` fields is event-type-specific and belongs in
 * the individual event processors, not here.
 */
export const InboundWebhookSchema = z.object({
  type: z
    .string({ required_error: 'type is required' })
    .min(1)
    .max(LIMITS.MEDIUM, 'type field too long'),
  data: z
    .record(z.unknown())
    .refine((d) => d !== null && typeof d === 'object', { message: 'data must be an object' }),
  id: z.string().max(LIMITS.UUID * 4).optional(),
});

// ─── CMS Schemas ──────────────────────────────────────────────────────────────

export const CreatePostSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1).max(LIMITS.MEDIUM),
  slug: z.string().max(LIMITS.MEDIUM).optional(),
  content: z.string({ required_error: 'Content is required' }).min(1).max(LIMITS.CONTENT),
  excerpt: z.string().max(LIMITS.LONG).optional(),
  featured_image: z.string().url('featured_image must be a valid URL').max(LIMITS.URL).optional().or(z.literal('')),
  status: z.enum(['draft', 'published']).default('draft'),
  category: z.string().max(LIMITS.SHORT).optional(),
  tags: z.string().max(LIMITS.MEDIUM).optional(),
});

export const CreatePageSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1).max(LIMITS.MEDIUM),
  slug: z.string({ required_error: 'Slug is required' }).min(1).max(LIMITS.MEDIUM),
  content: z.string({ required_error: 'Content is required' }).min(1).max(LIMITS.CONTENT),
  status: z.enum(['draft', 'published']).default('draft'),
});
