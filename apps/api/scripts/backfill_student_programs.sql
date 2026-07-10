-- Phase 3 Backfill Script
-- Best-effort match of students.program (free text) → programs table.
-- Safe to run multiple times (WHERE clauses skip already-linked rows).
-- Run with: npx wrangler d1 execute bmi-portal-db --file=scripts/backfill_student_programs.sql

-- ─── Step 1: Create a temporary staging table for unmatched rows ─────────────
-- This lets ops review what couldn't be matched without losing data.
CREATE TABLE IF NOT EXISTS _backfill_unmatched_programs (
  student_user_id  TEXT NOT NULL,
  program_text   TEXT,
  logged_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Step 2: Attempt confident program_id match on name (case-insensitive) ─
UPDATE students
SET program_id = (
  SELECT p.id FROM programs p
  WHERE lower(trim(p.name)) = lower(trim(students.program))
  LIMIT 1
)
WHERE program_id IS NULL
  AND program IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM programs p
    WHERE lower(trim(p.name)) = lower(trim(students.program))
  );

-- ─── Step 3: Attempt confident match on program code ───────────────────────
UPDATE students
SET program_id = (
  SELECT p.id FROM programs p
  WHERE lower(trim(p.code)) = lower(trim(students.program))
  LIMIT 1
)
WHERE program_id IS NULL
  AND program IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM programs p
    WHERE lower(trim(p.code)) = lower(trim(students.program))
  );

-- ─── Step 4: Log all remaining unmatched rows to staging table ───────────────
-- These are NOT guessed — they're flagged for manual review.
INSERT OR IGNORE INTO _backfill_unmatched_programs (student_user_id, program_text)
SELECT user_id, program
FROM students
WHERE program_id IS NULL
  AND program IS NOT NULL;

-- ─── Step 5: Insert student_programs rows for all matched students ──────────
-- Only inserts where:
--   (a) students.program_id is now set (matched above)
--   (b) users.person_id exists (Phase 1 backfill ran)
--   (c) no student_programs row yet exists for that uid
INSERT INTO student_programs (
  id, uid, program_id, admission_year, enrollment_date, status, current_flag
)
SELECT
  lower(hex(randomblob(16))),
  p.uid,
  s.program_id,
  CAST(substr(s.admission_date, 1, 4) AS INTEGER),
  s.admission_date,
  CASE s.status
    WHEN 'Active'    THEN 'active'
    WHEN 'Graduated' THEN 'graduated'
    WHEN 'Suspended' THEN 'suspended'
    WHEN 'Inactive'  THEN 'withdrawn'
    ELSE 'active'
  END,
  1
FROM students s
JOIN users u ON s.user_id = u.id
JOIN persons p ON u.person_id = p.id
WHERE s.program_id IS NOT NULL
  AND p.uid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM student_programs sp WHERE sp.uid = p.uid AND sp.current_flag = 1
  );

-- ─── Step 6: Audit log ───────────────────────────────────────────────────────
INSERT INTO admin_audit_logs (id, user_id, action, target_type, details)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  'backfill_student_programs',
  'students',
  json_object(
    'note', 'Phase 3 backfill: linked students.program_id and created student_programs rows',
    'matched_count', (SELECT COUNT(*) FROM student_programs WHERE created_at >= datetime('now', '-1 minute')),
    'unmatched_count', (SELECT COUNT(*) FROM _backfill_unmatched_programs)
  )
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');
