-- Phase 2 Backfill Script
-- Assigns APP-{Year}-{Serial} numbers to all existing submitted/reviewed/decided applications.
-- Safe to run multiple times: the WHERE clause skips already-numbered rows.
-- Run with: npx wrangler d1 execute bmi-portal-db --file=scripts/backfill_app_numbers.sql

-- Step 1: Seed the per-year counters from existing applications that already have a number
-- (idempotent — counters only advance, never decrease)
INSERT INTO application_number_counters (year, last_serial)
SELECT
  CAST(substr(submitted_at, 1, 4) AS INTEGER) AS year,
  COUNT(*) AS cnt
FROM applications
WHERE application_number IS NOT NULL
  AND submitted_at IS NOT NULL
GROUP BY year
ON CONFLICT(year) DO UPDATE SET
  last_serial = MAX(last_serial, excluded.last_serial);

-- Step 2: Assign numbers to un-numbered applications in submission order per year
-- D1/SQLite does not support multi-row UPDATE with ROW_NUMBER() directly,
-- so this is a single-pass statement using a correlated subcount.
UPDATE applications
SET application_number = (
  'APP-' ||
  substr(submitted_at, 1, 4) ||
  '-' ||
  substr(
    '00000' || (
      -- Count of applications in same year submitted strictly before this one, plus 1
      SELECT COUNT(*) + 1
      FROM applications a2
      WHERE substr(a2.submitted_at, 1, 4) = substr(applications.submitted_at, 1, 4)
        AND a2.submitted_at < applications.submitted_at
        AND a2.status NOT IN ('draft')
    ),
    -5
  )
)
WHERE application_number IS NULL
  AND submitted_at IS NOT NULL
  AND status NOT IN ('draft');

-- Step 3: Update per-year counters to reflect backfilled serials
INSERT INTO application_number_counters (year, last_serial)
SELECT
  CAST(substr(submitted_at, 1, 4) AS INTEGER) AS year,
  COUNT(*) AS cnt
FROM applications
WHERE application_number IS NOT NULL
  AND submitted_at IS NOT NULL
GROUP BY year
ON CONFLICT(year) DO UPDATE SET
  last_serial = MAX(last_serial, excluded.last_serial);

-- Step 4: Record the backfill run in admin_audit_logs
INSERT INTO admin_audit_logs (id, user_id, action, target_type, details)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  'backfill_application_numbers',
  'applications',
  json_object(
    'note', 'One-off backfill run — assigned APP-{Year}-{Serial} to all historical applications that lacked a number.',
    'count', (SELECT COUNT(*) FROM applications WHERE application_number IS NOT NULL AND submitted_at IS NOT NULL)
  )
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');
