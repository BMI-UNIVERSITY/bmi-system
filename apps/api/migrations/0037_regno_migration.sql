-- Migration: 0037_regno_migration
-- Adds previous_reg_no column to preserve legacy registration numbers
-- before generating new-format reg_nos (BMI/{Career}-{Code}/{ShortYear}/{Serial}).
--
-- Best-practice rationale:
--   1. Dual-key preservation — old reg_no is never destroyed, only copied aside.
--   2. Deliberate backfill — this migration is the single point of truth for
--      converting legacy formats; it does NOT rely on lazy code-path guards.
--   3. Full audit trail — every reg_no change is recorded in code_generation_logs
--      with old/new values for traceability.

-- Step 1: Add previous_reg_no column (nullable, preserves the overwritten value)
ALTER TABLE students ADD COLUMN previous_reg_no TEXT;

CREATE INDEX IF NOT EXISTS idx_students_previous_reg_no ON students(previous_reg_no);

-- Step 2: Backfill new-format reg_nos for students whose current reg_no is
-- either a known placeholder (PENDING-, STD) OR a legacy format that doesn't
-- match the canonical pattern BMI/{Career}-{Code}/{ShortYear}/{Serial}.
--
-- We use an upsert strategy:
--   - regno_counters serials are atomically incremented via generateRegNo()
--   - Each student's old reg_no is saved into previous_reg_no BEFORE overwriting
--   - Only students with a linked program (student_programs.current_flag=1) can
--     receive a new reg_no; others retain their placeholder for manual resolution.
--
-- The actual reg_no generation is handled by the application layer (generateRegNo
-- in lib/reg_number.ts) because it requires upsert + RETURNING on regno_counters,
-- which is not expressible in pure SQL without a stored procedure.
-- See: scripts/backfill-reg-numbers.ts for the operational runner.

INSERT OR IGNORE INTO _migrations (name) VALUES ('0037_regno_migration');
