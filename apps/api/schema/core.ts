import { pgTable, text, integer, timestamp, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';

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
  description: text('description'),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('departments_code_unique').on(t.code),
  index('idx_departments_faculty').on(t.faculty_id),
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
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('programs_code_unique').on(t.code),
  index('idx_programs_department').on(t.department_id),
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
