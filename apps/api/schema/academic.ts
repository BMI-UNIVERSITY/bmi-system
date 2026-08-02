import { pgTable, text, integer, real, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ─── Students ────────────────────────────────────────────────────────────────
export const students = pgTable('students', {
  user_id: text('user_id').primaryKey(),
  student_id: text('student_id'),
  uid: text('uid'),
  reg_no: text('reg_no').notNull(),
  previous_reg_no: text('previous_reg_no'),
  gender: text('gender'),
  date_of_birth: timestamp('date_of_birth'),
  nationality: text('nationality'),
  admission_date: timestamp('admission_date').notNull(),
  program: text('program').notNull(),
  program_id: text('program_id'),
  status: text('status').notNull().default('Active'),
  avatar_color: text('avatar_color'),
  study_center_id: text('study_center_id'),
  gpa: real('gpa'),
  year_of_study: integer('year_of_study'),
  graduation_date: timestamp('graduation_date'),
  degree_level: text('degree_level'),
  photo: text('photo'),
  card_qr_data: text('card_qr_data'),
  card_barcode: text('card_barcode'),
  card_issued_at: timestamp('card_issued_at'),
  card_expires_at: timestamp('card_expires_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('students_reg_no_unique').on(t.reg_no),
  uniqueIndex('idx_students_student_id').on(t.student_id),
  uniqueIndex('idx_students_uid').on(t.uid),
  index('idx_students_status').on(t.status),
  index('idx_students_user_id').on(t.user_id),
]);

export const studentProfiles = pgTable('student_profiles', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  preferred_name: text('preferred_name'),
  emergency_contact: text('emergency_contact'),
  emergency_phone: text('emergency_phone'),
  dietary_restrictions: text('dietary_restrictions'),
  disability_info: text('disability_info'),
  previous_education: text('previous_education'),
  employment_status: text('employment_status'),
  metadata: text('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('student_profiles_student_id_unique').on(t.student_id),
]);

// ─── Enrollments ─────────────────────────────────────────────────────────────
export const enrollments = pgTable('enrollments', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  course_id: text('course_id').notNull(),
  status: text('status').notNull().default('enrolled'),
  grade: text('grade'),
  term_id: text('term_id'),
  section_id: text('section_id'),
  registration_date: timestamp('registration_date').notNull().defaultNow(),
  enrolled_at: timestamp('enrolled_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('enrollments_student_course_unique').on(t.student_id, t.course_id),
  index('idx_enrollments_student').on(t.student_id),
  index('idx_enrollments_course').on(t.course_id),
  index('idx_enrollments_term').on(t.term_id),
]);

// ─── Grades ──────────────────────────────────────────────────────────────────
export const grades = pgTable('grades', {
  id: text('id').primaryKey(),
  enrollment_id: text('enrollment_id').notNull(),
  assessment_type: text('assessment_type').notNull(),
  score: real('score').notNull(),
  max_score: real('max_score').notNull(),
  graded_by: text('graded_by'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_grades_enrollment').on(t.enrollment_id),
]);

// ─── Academic Standing ───────────────────────────────────────────────────────
export const standingRules = pgTable('standing_rules', {
  id: text('id').primaryKey(),
  rule_name: text('rule_name').notNull(),
  standing: text('standing').notNull(),
  min_gpa: real('min_gpa'),
  max_gpa: real('max_gpa'),
  max_consecutive_terms: integer('max_consecutive_terms'),
  min_completion_rate: real('min_completion_rate'),
  is_active: integer('is_active').notNull().default(1),
  description: text('description'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('standing_rules_rule_name_unique').on(t.rule_name),
]);

export const academicStandingRecords = pgTable('academic_standing_records', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  term_id: text('term_id').notNull(),
  standing: text('standing').notNull(),
  term_gpa: real('term_gpa'),
  cumulative_gpa: real('cumulative_gpa'),
  credits_attempted: real('credits_attempted'),
  credits_earned: real('credits_earned'),
  completion_rate: real('completion_rate'),
  rule_id: text('rule_id'),
  notes: text('notes'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('academic_standing_student_term_unique').on(t.student_id, t.term_id),
  index('idx_standing_records_student').on(t.student_id),
  index('idx_standing_records_term').on(t.term_id),
]);

// ─── Courses & Curriculum (academic module) ──────────────────────────────────
export const programCurriculum = pgTable('program_curriculum', {
  id: text('id').primaryKey(),
  program_id: text('program_id').notNull(),
  course_id: text('course_id').notNull(),
  level: integer('level'),
  semester: integer('semester'),
  core: integer('core').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('idx_curriculum_program').on(t.program_id),
  index('idx_curriculum_course').on(t.course_id),
]);

export const programCourses = pgTable('program_courses', {
  program_id: text('program_id').notNull(),
  course_id: text('course_id').notNull(),
  is_required: integer('is_required').notNull().default(0),
  semester: integer('semester'),
  level: integer('level'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('program_courses_program_course_unique').on(t.program_id, t.course_id),
]);

export const courseSections = pgTable('course_sections', {
  id: text('id').primaryKey(),
  course_id: text('course_id').notNull(),
  section_code: text('section_code').notNull(),
  instructor_id: text('instructor_id'),
  schedule: text('schedule'),
  capacity: integer('capacity').notNull().default(0),
  enrolled: integer('enrolled').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_sections_course').on(t.course_id),
]);

export const studentHolds = pgTable('student_holds', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  type: text('type').notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('active'),
  created_by: text('created_by'),
  resolved_by: text('resolved_by'),
  resolved_at: timestamp('resolved_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_holds_student').on(t.student_id),
  index('idx_holds_status').on(t.status),
]);

export const studentCourseRegistrations = pgTable('student_course_registrations', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  course_id: text('course_id').notNull(),
  status: text('status').notNull().default('registered'),
  approval_status: text('approval_status').notNull().default('pending'),
  semester: text('semester'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_registrations_student').on(t.student_id),
]);
