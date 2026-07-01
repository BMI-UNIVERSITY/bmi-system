-- Phase 1 Backfill Script
-- Generates UIDs for all existing students and staff.
-- Run with: npx wrangler d1 execute bmi-portal-db --file=scripts/backfill_uids.sql

-- 1. Generate a person_id for each eligible user
UPDATE users 
SET person_id = lower(hex(randomblob(16))) 
WHERE role IN ('student', 'staff') AND person_id IS NULL;

-- 2. Insert into persons using the generated person_id, and assign a sequential UID
INSERT INTO persons (id, first_name, last_name, created_at, updated_at, uid)
SELECT 
  u.person_id,
  u.first_name,
  u.last_name,
  datetime('now'),
  datetime('now'),
  'BMI' || substr('000000000' || (c.last_serial + row_number() over (order by u.created_at)), -9, 9)
FROM users u
CROSS JOIN uid_counters c
WHERE u.role IN ('student', 'staff') AND u.person_id IS NOT NULL
  AND u.person_id NOT IN (SELECT id FROM persons);

-- 3. Update the counter
UPDATE uid_counters 
SET last_serial = last_serial + (SELECT COUNT(*) FROM users WHERE role IN ('student', 'staff') AND person_id NOT IN (SELECT id FROM persons));
