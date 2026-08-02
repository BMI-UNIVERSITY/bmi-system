-- Migration: 0030_program_rename (fixed)
-- Ensures all indexes on student_programs are correctly named.
-- The table is already named "student_programs" (created in 0004).
-- Self-rename ALTER TABLE statements removed (invalid in SQLite).

-- Rebuild indexes with consistent naming
DROP INDEX IF EXISTS idx_student_progs_uid;
DROP INDEX IF EXISTS idx_student_progs_programme;
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
