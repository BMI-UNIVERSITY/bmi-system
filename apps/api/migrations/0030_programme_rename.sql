-- Migration: 0030_program_rename
-- Renames "program" to "program" across all tables, columns, and indexes
-- for consistency with the "programs" table naming convention.
-- Uses ALTER TABLE RENAME (SQLite 3.25+ / D1 supported).

-- 1. Rename student_programs table -> student_programs
ALTER TABLE student_programs RENAME TO student_programs;

-- 2. Rename columns within student_programs
ALTER TABLE student_programs RENAME COLUMN program_id TO program_id;

-- 3. Rename students.program -> students.program
ALTER TABLE students RENAME COLUMN program TO program;

-- 4. Rename courses.program_id -> courses.program_id
ALTER TABLE courses RENAME COLUMN program_id TO program_id;

-- 5. Rename regno_counters.program_id -> regno_counters.program_id
ALTER TABLE regno_counters RENAME COLUMN program_id TO program_id;

-- 6. Rebuild indexes with new names (drop old, create new)
DROP INDEX IF EXISTS idx_student_progs_uid;
DROP INDEX IF EXISTS idx_student_progs_program;
DROP INDEX IF EXISTS idx_student_progs_current;
DROP INDEX IF EXISTS idx_student_progs_one_current;
DROP INDEX IF EXISTS idx_student_programs_admission;
DROP INDEX IF EXISTS idx_students_program_status;
DROP INDEX IF EXISTS idx_student_programs_student;

CREATE INDEX IF NOT EXISTS idx_student_progs_uid      ON student_programs(uid);
CREATE INDEX IF NOT EXISTS idx_student_progs_program   ON student_programs(program_id);
CREATE INDEX IF NOT EXISTS idx_student_progs_current   ON student_programs(uid, current_flag);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_progs_one_current ON student_programs(uid) WHERE current_flag = 1;
CREATE INDEX IF NOT EXISTS idx_student_programs_admission ON student_programs(admission_year, status);
CREATE INDEX IF NOT EXISTS idx_students_program_status ON students(program_id, status);
CREATE INDEX IF NOT EXISTS idx_student_programs_student ON student_programs(student_id);
