-- Migration: 0022_student_onboarding_flow
-- Implements holds-based registration, curriculum mapping, program fees, and auto-enrollment.

-- Drop existing indexes first if re-running
DROP INDEX IF EXISTS idx_student_holds_student;
DROP INDEX IF EXISTS idx_program_curriculum_program;
DROP INDEX IF EXISTS idx_program_courses_curriculum;
DROP INDEX IF EXISTS idx_student_course_reg_term;

-- 1. STUDENT HOLDS
-- Blocks course registration until each hold is resolved.
CREATE TABLE IF NOT EXISTS student_holds (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hold_type   TEXT NOT NULL CHECK(hold_type IN ('document', 'orientation', 'course_selection', 'payment')),
  reason      TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_student_holds_student ON student_holds(student_id);

-- 2. PROGRAM CURRICULUM
-- Defines which terms (semesters/years) exist for a program.
-- Example: BTh program → Term 1 (Semester 1), Term 2 (Semester 2), ...
CREATE TABLE IF NOT EXISTS program_curriculum (
  id          TEXT PRIMARY KEY,
  program_id  TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  term_id     TEXT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  term_number INTEGER NOT NULL,
  UNIQUE(program_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_program_curriculum_program ON program_curriculum(program_id);

-- 3. PROGRAM COURSES
-- Courses within each curriculum term. Mandatory courses are auto-enrolled;
-- elective courses let the student choose after guidance.
CREATE TABLE IF NOT EXISTS program_courses (
  id              TEXT PRIMARY KEY,
  curriculum_id   TEXT NOT NULL REFERENCES program_curriculum(id) ON DELETE CASCADE,
  course_id       TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  is_mandatory    INTEGER NOT NULL DEFAULT 1,
  elective_group  TEXT,
  UNIQUE(curriculum_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_program_courses_curriculum ON program_courses(curriculum_id);

-- 4. PROGRAM FEES
-- Program-based tuition (not per-course). A single fee per program per term.
CREATE TABLE IF NOT EXISTS program_fees (
  id          TEXT PRIMARY KEY,
  program_id  TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  term_id     TEXT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  amount      REAL NOT NULL,
  description TEXT,
  UNIQUE(program_id, term_id)
);

-- 5. STUDENT COURSE REGISTRATIONS (per-term)
-- Tracks which courses a student is registered for in a given term.
-- Distinguishes auto-enrolled mandatory courses from student-selected electives.
CREATE TABLE IF NOT EXISTS student_course_registrations (
  id              TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  term_id         TEXT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  registration_type TEXT NOT NULL CHECK(registration_type IN ('auto', 'elective')),
  status          TEXT NOT NULL DEFAULT 'registered' CHECK(status IN ('registered', 'dropped', 'completed', 'failed')),
  registered_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, course_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_student_course_reg_term ON student_course_registrations(student_id, term_id);
