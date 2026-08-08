import { pgTable, text, integer, real, timestamp, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ─── Auth / Identity ─────────────────────────────────────────────────────────
// NOTE: Boolean-ish flags are stored as INTEGER 0/1 to stay wire-compatible
// with the existing D1 raw-SQL routes (which compare `=== 1`). Strict BOOLEAN
// columns are adopted incrementally as routes migrate to Drizzle (Phase 4).
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('applicant'),
  is_verified: integer('is_verified').notNull().default(0),
  verification_token: text('verification_token'),
  mfa_secret: text('mfa_secret'),
  mfa_enabled: integer('mfa_enabled').notNull().default(0),
  session_version: integer('session_version').notNull().default(1),
  failed_login_attempts: integer('failed_login_attempts').notNull().default(0),
  locked_until: timestamp('locked_until'),
  account_claimed: integer('account_claimed').notNull().default(0),
  student_email: text('student_email'),
  person_id: text('person_id'),
  admission_code: text('admission_code'),
  admission_code_expires_at: timestamp('admission_code_expires_at'),
  date_of_birth: timestamp('date_of_birth'),
  nationality: text('nationality'),
  address: text('address'),
  gender: text('gender'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('users_email_unique').on(t.email),
  index('idx_users_role').on(t.role),
]);

// ─── Generic Key-Value Metadata ──────────────────────────────────────────────
export const metadata = pgTable('metadata', {
  id: text('id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
}, (t) => [
  primaryKey({ columns: [t.id, t.key] }),
]);

// ─── Academic Structure ──────────────────────────────────────────────────────
export const faculties = pgTable('faculties', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  dean_id: text('dean_id'),
  description: text('description'),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('faculties_code_unique').on(t.code),
]);

export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  faculty_id: text('faculty_id').notNull(),
  head_id: text('head_id'),
  school_id: text('school_id'),
  description: text('description'),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('departments_code_unique').on(t.code),
  index('idx_departments_faculty').on(t.faculty_id),
  index('idx_departments_school').on(t.school_id),
]);

export const programs = pgTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  degree_type: text('degree_type').notNull(),
  level: text('level').notNull(),
  department_id: text('department_id').notNull(),
  duration_years: integer('duration_years').notNull(),
  total_credit_hours: integer('total_credit_hours').notNull(),
  mode_of_study: text('mode_of_study').notNull(),
  career_code: text('career_code'),
  isced_code: text('isced_code'),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('programs_code_unique').on(t.code),
  index('idx_programs_department').on(t.department_id),
  index('idx_programs_career').on(t.career_code),
  index('idx_programs_isced').on(t.isced_code),
]);

export const courses = pgTable('courses', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  title: text('title').notNull(),
  name: text('name'),
  description: text('description'),
  level: text('level'),
  credits: integer('credits').notNull(),
  term: text('term'),
  capacity: integer('capacity').notNull(),
  department_id: text('department_id'),
  program_id: text('program_id'),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('courses_code_unique').on(t.code),
  index('idx_courses_department').on(t.department_id),
  index('idx_courses_program').on(t.program_id),
]);

export const academicTerms = pgTable('academic_terms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  academic_year: text('academic_year').notNull(),
  semester_number: integer('semester_number').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  status: text('status').notNull().default('upcoming'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('academic_terms_code_unique').on(t.code),
]);

// ─── Portals / App Config ────────────────────────────────────────────────────
export const appConfig = pgTable('app_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const persons = pgTable('persons', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull(),
  national_id: text('national_id'),
  passport_no: text('passport_no'),
  first_name: text('first_name'),
  middle_name: text('middle_name'),
  last_name: text('last_name'),
  gender: text('gender'),
  date_of_birth: timestamp('date_of_birth'),
  nationality: text('nationality'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('persons_uid_unique').on(t.uid),
]);

// ─── Applications & Admissions ────────────────────────────────────────────────
export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  program: text('program').notNull(),
  degree_level: text('degree_level').notNull(),
  status: text('status').notNull().default('draft'),
  personal_statement: text('personal_statement'),
  prior_education: text('prior_education'),
  submitted_at: timestamp('submitted_at'),
  reviewed_at: timestamp('reviewed_at'),
  reviewer_id: text('reviewer_id'),
  reviewer_notes: text('reviewer_notes'),
  application_number: text('application_number'),
  high_school: text('high_school'),
  graduation_year: integer('graduation_year'),
  gpa: real('gpa'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_apps_user_id').on(t.user_id),
  index('idx_apps_status').on(t.status),
  uniqueIndex('idx_applications_number').on(t.application_number),
]);

export const applicationDrafts = pgTable('application_drafts', {
  user_id: text('user_id').primaryKey(),
  application_data: text('application_data').notNull(),
  current_step: integer('current_step').notNull().default(1),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const applicationStatusLogs = pgTable('application_status_logs', {
  id: text('id').primaryKey(),
  application_id: text('application_id').notNull(),
  changed_by: text('changed_by').notNull(),
  old_status: text('old_status'),
  new_status: text('new_status').notNull(),
  notes: text('notes'),
  changed_at: timestamp('changed_at').notNull().defaultNow(),
}, (t) => [
  index('idx_status_logs_app_id').on(t.application_id),
]);

export const applicationNumberCounters = pgTable('application_number_counters', {
  year: integer('year').primaryKey(),
  last_serial: integer('last_serial').notNull().default(0),
});

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  application_id: text('application_id').notNull(),
  user_id: text('user_id').notNull(),
  doc_type: text('doc_type').notNull(),
  file_name: text('file_name').notNull(),
  r2_key: text('r2_key').notNull(),
  mime_type: text('mime_type').notNull(),
  file_size_bytes: integer('file_size_bytes').notNull().default(0),
  uploaded_at: timestamp('uploaded_at').notNull().defaultNow(),
  archived_at: timestamp('archived_at'),
  expires_at: timestamp('expires_at'),
  is_sensitive: integer('is_sensitive').notNull().default(0),
  view_count: integer('view_count').notNull().default(0),
}, (t) => [
  uniqueIndex('documents_r2_key_unique').on(t.r2_key),
  index('idx_docs_application_id').on(t.application_id),
  index('idx_docs_user_id').on(t.user_id),
  index('idx_docs_archived').on(t.archived_at),
  index('idx_docs_expires').on(t.expires_at),
]);

export const recommendationRequests = pgTable('recommendation_requests', {
  id: text('id').primaryKey(),
  application_id: text('application_id').notNull(),
  referee_name: text('referee_name').notNull(),
  referee_email: text('referee_email').notNull(),
  token: text('token').notNull(),
  status: text('status').notNull().default('requested'),
  document_id: text('document_id'),
  requested_at: timestamp('requested_at').notNull().defaultNow(),
  completed_at: timestamp('completed_at'),
}, (t) => [
  uniqueIndex('recommendation_requests_token_unique').on(t.token),
  index('idx_recs_app_id').on(t.application_id),
]);

// ─── Auth / Sessions / Verification ───────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_sessions_user_id').on(t.user_id),
  index('idx_sessions_expires').on(t.expires_at),
]);

export const rateLimits = pgTable('rate_limits', {
  ip_address: text('ip_address').notNull(),
  endpoint: text('endpoint').notNull(),
  window_start: timestamp('window_start').notNull().defaultNow(),
  request_count: integer('request_count').notNull().default(1),
}, (t) => [
  primaryKey({ columns: [t.ip_address, t.endpoint, t.window_start] }),
  index('idx_rate_limits_ip').on(t.ip_address, t.window_start),
]);

export const emailVerifications = pgTable('email_verifications', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  token: text('token').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  verified_at: timestamp('verified_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('email_verifications_token_unique').on(t.token),
  index('idx_email_verif_user').on(t.user_id),
]);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  token: text('token').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  used_at: timestamp('used_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('password_reset_tokens_token_unique').on(t.token),
  index('idx_pwd_reset_user').on(t.user_id),
]);

export const oauthAccounts = pgTable('oauth_accounts', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  provider: text('provider').notNull(),
  provider_id: text('provider_id').notNull(),
  access_token: text('access_token').notNull(),
  refresh_token: text('refresh_token'),
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('oauth_accounts_provider_provider_id_unique').on(t.provider, t.provider_id),
  index('idx_oauth_user').on(t.user_id),
]);

export const emailLogs = pgTable('email_logs', {
  id: text('id').primaryKey(),
  to_address: text('to_address').notNull(),
  subject: text('subject').notNull(),
  status: text('status').notNull().default('pending'),
  error_message: text('error_message'),
  attempts: integer('attempts').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_email_logs_status').on(t.status),
  index('idx_email_logs_to').on(t.to_address),
]);

// ─── Audit / Logs / Webhooks ──────────────────────────────────────────────────
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  action: text('action').notNull(),
  target_type: text('target_type'),
  target_id: text('target_id'),
  details: text('details'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_admin_audit_user').on(t.user_id),
  index('idx_admin_audit_action').on(t.action),
  index('idx_admin_audit_created').on(t.created_at),
]);

export const syncEventLog = pgTable('sync_event_log', {
  id: text('id').primaryKey(),
  event_type: text('event_type').notNull(),
  payload: text('payload').notNull(),
  target_url: text('target_url'),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  last_error: text('last_error'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  resolved_at: timestamp('resolved_at'),
}, (t) => [
  index('idx_event_log_status').on(t.status),
  index('idx_event_log_type').on(t.event_type),
  index('idx_event_log_created').on(t.created_at),
]);

export const webhookDeadLetters = pgTable('webhook_dead_letters', {
  id: text('id').primaryKey(),
  event_log_id: text('event_log_id').notNull(),
  payload: text('payload').notNull(),
  last_error: text('last_error'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_dead_letters_event').on(t.event_log_id),
]);

// ─── Finance ──────────────────────────────────────────────────────────────────
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  uid: text('uid'),
  amount: integer('amount').notNull(),
  status: text('status').notNull().default('unpaid'),
  due_date: timestamp('due_date').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_invoices_student').on(t.student_id),
  index('idx_invoices_uid').on(t.uid),
]);

export const ledgerAccounts = pgTable('ledger_accounts', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull(),
  status: text('status').notNull().default('active'),
  label: text('label'),
  metadata: text('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('ledger_accounts_uid_unique').on(t.uid),
  index('idx_ledger_accounts_uid').on(t.uid),
]);

export const ledgerEntries = pgTable('ledger_entries', {
  id: text('id').primaryKey(),
  account_id: text('account_id').notNull(),
  entry_type: text('entry_type').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('XAF'),
  description: text('description'),
  reference_type: text('reference_type'),
  reference_id: text('reference_id'),
  term_id: text('term_id'),
  created_by: text('created_by'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_ledger_entries_account').on(t.account_id),
  index('idx_ledger_entries_term').on(t.term_id),
  index('idx_ledger_entries_type').on(t.entry_type),
]);

// ─── CMS ──────────────────────────────────────────────────────────────────────
export const cmsPages = pgTable('cms_pages', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: text('content'),
  status: text('status').notNull().default('draft'),
  author_id: text('author_id').notNull(),
  published_at: timestamp('published_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('cms_pages_slug_unique').on(t.slug),
  index('idx_cms_pages_status').on(t.status),
]);

export const cmsPosts = pgTable('cms_posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  status: text('status').notNull().default('draft'),
  author_id: text('author_id').notNull(),
  published_at: timestamp('published_at'),
  tags: text('tags'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('cms_posts_slug_unique').on(t.slug),
  index('idx_cms_posts_status').on(t.status),
  index('idx_cms_posts_published_at').on(t.published_at),
]);

export const cmsMedia = pgTable('cms_media', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  r2_key: text('r2_key').notNull(),
  mime_type: text('mime_type').notNull(),
  file_size_bytes: integer('file_size_bytes').notNull(),
  uploader_id: text('uploader_id').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('cms_media_r2_key_unique').on(t.r2_key),
  index('idx_cms_media_uploader').on(t.uploader_id),
]);

export const contactSubmissions = pgTable('contact_submissions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  status: text('status').notNull().default('new'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_contact_status').on(t.status),
  index('idx_contact_created').on(t.created_at),
  index('idx_contact_email').on(t.email),
]);

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  source: text('source').notNull().default('website_footer'),
  status: text('status').notNull().default('active'),
  subscribed_at: timestamp('subscribed_at').notNull().defaultNow(),
  unsubscribed_at: timestamp('unsubscribed_at'),
}, (t) => [
  uniqueIndex('newsletter_subscribers_email_unique').on(t.email),
  index('idx_newsletter_status').on(t.status),
]);

// ─── Student Support & Settings ───────────────────────────────────────────────
export const studentSettings = pgTable('student_settings', {
  student_id: text('student_id').primaryKey(),
  directory_release: integer('directory_release').notNull().default(1),
  communications_opt_in: integer('communications_opt_in').notNull().default(1),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const supportTickets = pgTable('support_tickets', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('open'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_support_tickets_student').on(t.student_id),
]);

// ─── Identity Counters & Lifecycle ────────────────────────────────────────────
export const uidCounters = pgTable('uid_counters', {
  id: integer('id').primaryKey(),
  last_serial: integer('last_serial').notNull().default(0),
});

export const regnoCounters = pgTable('regno_counters', {
  program_id: text('program_id').notNull(),
  admission_year: integer('admission_year').notNull(),
  last_serial: integer('last_serial').notNull().default(0),
}, (t) => [
  primaryKey({ columns: [t.program_id, t.admission_year] }),
]);

export const studentPrograms = pgTable('student_programs', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull(),
  registration_number: text('registration_number'),
  program_id: text('program_id').notNull(),
  admission_year: integer('admission_year').notNull(),
  enrollment_date: timestamp('enrollment_date').notNull(),
  completion_date: timestamp('completion_date'),
  status: text('status').notNull().default('active'),
  current_flag: integer('current_flag').notNull().default(1),
  graduated_flag: integer('graduated_flag').notNull().default(0),
  cgpa: real('cgpa'),
  classification: text('classification'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_student_progs_uid').on(t.uid),
  index('idx_student_progs_program').on(t.program_id),
  index('idx_student_progs_current').on(t.uid, t.current_flag),
  uniqueIndex('idx_student_progs_one_current').on(t.uid),
]);

export const lifecycleEvents = pgTable('lifecycle_events', {
  id: text('id').primaryKey(),
  uid: text('uid'),
  application_id: text('application_id'),
  stage: text('stage').notNull(),
  status: text('status').notNull().default('pending'),
  idempotency_key: text('idempotency_key').notNull(),
  actor_id: text('actor_id'),
  notes: text('notes'),
  error_detail: text('error_detail'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('lifecycle_events_idempotency_key_unique').on(t.idempotency_key),
  index('idx_lifecycle_uid').on(t.uid),
  index('idx_lifecycle_app_id').on(t.application_id),
  index('idx_lifecycle_stage').on(t.stage, t.status),
  index('idx_lifecycle_created').on(t.created_at),
]);

export const provisioningJobs = pgTable('provisioning_jobs', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull(),
  job_type: text('job_type').notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  last_error: text('last_error'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  completed_at: timestamp('completed_at'),
}, (t) => [
  index('idx_provisioning_uid').on(t.uid),
  index('idx_provisioning_status').on(t.status),
]);

// ─── Academic Structure Support (careers, schools, ISCED, etc.) ───────────────
export const academicCareers = pgTable('academic_careers', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sort_order: integer('sort_order').notNull().default(0),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  faculty_id: text('faculty_id').notNull(),
  dean_id: text('dean_id'),
  description: text('description'),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('schools_code_unique').on(t.code),
]);

export const notificationTemplates = pgTable('notification_templates', {
  id: text('id').primaryKey(),
  template_key: text('template_key').notNull(),
  subject: text('subject').notNull(),
  body_html: text('body_html').notNull(),
  body_text: text('body_text'),
  variables: text('variables').notNull().default('[]'),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('notification_templates_template_key_unique').on(t.template_key),
]);

export const codeGenerationLogs = pgTable('code_generation_logs', {
  id: text('id').primaryKey(),
  code_type: text('code_type').notNull(),
  generated_code: text('generated_code').notNull(),
  context: text('context'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_code_gen_type').on(t.code_type),
  index('idx_code_gen_created').on(t.created_at),
]);

export const iscedFields = pgTable('isced_fields', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const transferCredits = pgTable('transfer_credits', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  source_type: text('source_type').notNull(),
  source_name: text('source_name').notNull(),
  source_course_code: text('source_course_code'),
  source_course_title: text('source_course_title'),
  source_credits: real('source_credits').notNull(),
  awarded_credits: real('awarded_credits').notNull().default(0),
  equivalent_course_id: text('equivalent_course_id'),
  recipient_program_id: text('recipient_program_id'),
  term_id: text('term_id'),
  decision: text('decision').notNull().default('pending'),
  reviewed_by: text('reviewed_by'),
  review_notes: text('review_notes'),
  metadata: text('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_transfer_credits_student').on(t.student_id),
  index('idx_transfer_credits_decision').on(t.decision),
  index('idx_transfer_credits_program').on(t.recipient_program_id),
]);

export const advancedStanding = pgTable('advanced_standing', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  program_id: text('program_id').notNull(),
  course_id: text('course_id').notNull(),
  standing_type: text('standing_type').notNull(),
  approved_by: text('approved_by'),
  approved_at: timestamp('approved_at').notNull().defaultNow(),
  notes: text('notes'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_advanced_standing_student').on(t.student_id),
  index('idx_advanced_standing_program').on(t.program_id),
]);

// ─── Certificates & Transcripts ───────────────────────────────────────────────
export const certificates = pgTable('certificates', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  serial_number: text('serial_number').notNull(),
  degree_title: text('degree_title').notNull(),
  issue_date: timestamp('issue_date').notNull(),
  gpa: real('gpa'),
  status: text('status').notNull().default('ISSUED'),
  content_hash: text('content_hash').notNull(),
  verification_count: integer('verification_count').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('certificates_serial_number_unique').on(t.serial_number),
  index('idx_certificates_student').on(t.student_id),
]);

export const transcriptJobs = pgTable('transcript_jobs', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  status: text('status').notNull().default('queued'),
  format: text('format').notNull().default('pdf'),
  r2_key: text('r2_key'),
  error: text('error'),
  requested_at: timestamp('requested_at').notNull().defaultNow(),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
}, (t) => [
  index('idx_transcript_jobs_student_id').on(t.student_id),
]);
