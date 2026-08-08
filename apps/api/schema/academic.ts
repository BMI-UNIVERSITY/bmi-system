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
  term_id: text('term_id').notNull(),
  term_number: integer('term_number').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('program_curriculum_program_term_unique').on(t.program_id, t.term_id),
  index('idx_program_curriculum_program').on(t.program_id),
]);

export const programCourses = pgTable('program_courses', {
  id: text('id').primaryKey(),
  curriculum_id: text('curriculum_id').notNull(),
  course_id: text('course_id').notNull(),
  is_mandatory: integer('is_mandatory').notNull().default(1),
  elective_group: text('elective_group'),
  prerequisite_ids: text('prerequisite_ids'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('program_courses_curriculum_course_unique').on(t.curriculum_id, t.course_id),
  index('idx_program_courses_curriculum').on(t.curriculum_id),
]);

export const courseSections = pgTable('course_sections', {
  id: text('id').primaryKey(),
  course_id: text('course_id').notNull(),
  term_id: text('term_id').notNull(),
  section_code: text('section_code').notNull(),
  instructor_id: text('instructor_id'),
  capacity: integer('capacity').notNull().default(0),
  room: text('room'),
  schedule: text('schedule'),
  is_active: integer('is_active').notNull().default(1),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('course_sections_course_term_code_unique').on(t.course_id, t.term_id, t.section_code),
  index('idx_course_sections_course').on(t.course_id),
  index('idx_course_sections_term').on(t.term_id),
  index('idx_course_sections_instr').on(t.instructor_id),
]);

export const studentHolds = pgTable('student_holds', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  hold_type: text('hold_type').notNull(),
  reason: text('reason').notNull(),
  is_active: integer('is_active').notNull().default(1),
  metadata: text('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  resolved_at: timestamp('resolved_at'),
}, (t) => [
  index('idx_student_holds_student').on(t.student_id),
]);

export const studentCourseRegistrations = pgTable('student_course_registrations', {
  id: text('id').primaryKey(),
  student_id: text('student_id').notNull(),
  course_id: text('course_id').notNull(),
  term_id: text('term_id').notNull(),
  registration_type: text('registration_type').notNull(),
  status: text('status').notNull().default('registered'),
  section_id: text('section_id'),
  registered_at: timestamp('registered_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('student_course_registrations_student_course_term_unique').on(t.student_id, t.course_id, t.term_id),
  index('idx_student_course_reg_term').on(t.student_id, t.term_id),
  index('idx_student_course_reg_section').on(t.section_id),
]);

// ─── Timetabling & Rubrics ────────────────────────────────────────────────────
export const timetabling = pgTable('timetabling', {
  id: text('id').primaryKey(),
  course_id: text('course_id').notNull(),
  instructor_id: text('instructor_id'),
  classroom_id: text('classroom_id'),
  day_of_week: text('day_of_week').notNull(),
  start_time: text('start_time').notNull(),
  end_time: text('end_time').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_timetabling_course').on(t.course_id),
  index('idx_timetabling_instructor').on(t.instructor_id),
  index('idx_timetabling_day').on(t.day_of_week),
]);

export const rubrics = pgTable('rubrics', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  course_id: text('course_id'),
  criteria: text('criteria').notNull(),
  total_points: integer('total_points').notNull().default(100),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_rubrics_course').on(t.course_id),
]);

// ─── Program Fees ─────────────────────────────────────────────────────────────
export const programFees = pgTable('program_fees', {
  id: text('id').primaryKey(),
  program_id: text('program_id').notNull(),
  term_id: text('term_id').notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('program_fees_program_term_unique').on(t.program_id, t.term_id),
  index('idx_program_fees_program').on(t.program_id),
]);
