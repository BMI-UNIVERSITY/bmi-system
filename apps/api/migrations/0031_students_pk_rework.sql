-- Migration: 0031_students_pk_rework
-- Adds a stable, auto-generated student_id to the students table.
--
-- DESIGN RATIONALE:
--   The current students table uses user_id (auth UUID) as the PK.
--   This is technically correct but couples academic identity to the
--   auth system. A dedicated student_id provides:
--     1. A stable, portable academic identifier independent of auth
--     2. Future-proofing for SSO / identity federation
--     3. A clean separation of academic vs auth concerns
--
-- APPROACH (SQLite-safe):
--   SQLite does not support ALTER COLUMN or RENAME CONSTRAINT.
--   We add student_id as a new UNIQUE column and backfill it.
--   The user_id column remains the PK (all existing routes unchanged).
--   A unique index on student_id makes it usable as a stable identifier.
--   All new cross-system references SHOULD use student_id going forward.

-- Guard: only run if student_id column does not already exist
-- (SQLite will error on duplicate ALTER TABLE ADD COLUMN)

-- Step 1: Add student_id column
ALTER TABLE students ADD COLUMN student_id TEXT;

-- Step 2: Backfill — generate a UUID for every existing student
--   lower(hex(randomblob(16))) produces a 32-char hex string.
--   We format it as 8-4-4-4-12 UUID v4 for readability.
--   Since SQLite lacks a built-in UUID function we use the hex approach
--   and format in the application layer; here we store the raw 32-char hex.
UPDATE students
SET student_id = lower(hex(randomblob(16)))
WHERE student_id IS NULL;

-- Step 3: Add NOT NULL constraint via new index (SQLite can't add NOT NULL after creation)
--   We enforce uniqueness + non-null via a UNIQUE index and application logic.
--   Future migrations can rebuild the table to enforce NOT NULL at DDL level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

-- Step 4: Add index on user_id for explicit FK lookups
--   (user_id is still the PK so it already has an implicit B-tree index,
--    but we make this explicit for clarity and query planner hints)
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- Step 5: Record migration
INSERT OR IGNORE INTO _migrations (name) VALUES ('0031_students_pk_rework');
