-- Phase 3 Backfill Script
-- Best-effort match of students.programme (free text) → programs table.
-- Safe to run multiple times (WHERE clauses skip already-linked rows).
-- Run with: npx wrangler d1 execute bmi-portal-db --file=scripts/backfill_student_programmes.sql

-- ─── Step 1: Create a temporary staging table for unmatched rows ─────────────
-- This lets ops review what couldn't be matched without losing data.
CREATE TABLE IF NOT EXISTS _backfill_unmatched_programmes (
  student_user_id  TEXT NOT NULL,
  programme_text   TEXT,
  logged_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Step 2: Attempt confident programme_id match on name (case-insensitive) ─
UPDATE students
SET programme_id = (
  SELECT p.id FROM programs p
  WHERE lower(trim(p.name)) = lower(trim(students.programme))
  LIMIT 1
)
WHERE programme_id IS NULL
  AND programme IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM programs p
    WHERE lower(trim(p.name)) = lower(trim(students.programme))
  );

-- ─── Step 3: Attempt confident match on programme code ───────────────────────
UPDATE students
SET programme_id = (
  SELECT p.id FROM programs p
  WHERE lower(trim(p.code)) = lower(trim(students.programme))
  LIMIT 1
)
WHERE programme_id IS NULL
  AND programme IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM programs p
    WHERE lower(trim(p.code)) = lower(trim(students.programme))
  );

-- ─── Step 4: Log all remaining unmatched rows to staging table ───────────────
-- These are NOT guessed — they're flagged for manual review.
INSERT OR IGNORE INTO _backfill_unmatched_programmes (student_user_id, programme_text)
SELECT user_id, programme
FROM students
WHERE programme_id IS NULL
  AND programme IS NOT NULL;

-- ─── Step 5: Insert student_programmes rows for all matched students ──────────
-- Only inserts where:
--   (a) students.programme_id is now set (matched above)
--   (b) users.person_id exists (Phase 1 backfill ran)
--   (c) no student_programmes row yet exists for that uid
INSERT INTO student_programmes (
  id, uid, programme_id, admission_year, enrollment_date, status, current_flag
)
SELECT
  lower(hex(randomblob(16))),
  p.uid,
  s.programme_id,
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
WHERE s.programme_id IS NOT NULL
  AND p.uid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM student_programmes sp WHERE sp.uid = p.uid AND sp.current_flag = 1
  );

-- ─── Step 6: Audit log ───────────────────────────────────────────────────────
INSERT INTO admin_audit_logs (id, user_id, action, target_type, details)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  'backfill_student_programmes',
  'students',
  json_object(
    'note', 'Phase 3 backfill: linked students.programme_id and created student_programmes rows',
    'matched_count', (SELECT COUNT(*) FROM student_programmes WHERE created_at >= datetime('now', '-1 minute')),
    'unmatched_count', (SELECT COUNT(*) FROM _backfill_unmatched_programmes)
  )
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');
