-- ============================================================================
-- BMI UMS — Registration Number Backfill (generated 2026-07-25T05:52:54.232Z)
-- Target year: 2026 (short: 226)
-- ============================================================================
-- SAFE TO RE-RUN.  Students whose previous_reg_no is already set will be
-- skipped, and regno_counters will keep incrementing correctly.
--
-- Preview affected rows before applying:
--   SELECT s.user_id, s.reg_no, pr.code AS program,
--          COALESCE(ac.code, UPPER(REPLACE(pr.level, ' ', ''))) AS career_code
--   FROM students s
--   JOIN users u ON u.id = s.user_id
--   JOIN persons p ON p.id = u.person_id
--   JOIN student_programs sp ON sp.uid = p.uid AND sp.current_flag = 1
--   JOIN programs pr ON pr.id = sp.program_id
--   LEFT JOIN academic_careers ac ON ac.code = pr.career_code
--   WHERE s.previous_reg_no IS NULL
--     AND (s.reg_no LIKE 'PENDING%' OR s.reg_no LIKE 'STD%' OR s.reg_no NOT LIKE 'BMI/%/%/%');
-- ============================================================================

-- Step 1: Ensure the previous_reg_no column exists
ALTER TABLE students ADD COLUMN previous_reg_no TEXT;

-- Step 2: Copy old reg_no to previous_reg_no for every student who needs migration
--         (PENDING-* / STD* / any reg_no not in canonical BMI/{C}-{P}/{Y}/{S} form)
UPDATE students
SET previous_reg_no = reg_no,
    updated_at = datetime('now')
WHERE previous_reg_no IS NULL
  AND user_id IN (
    SELECT s.user_id
    FROM students s
    JOIN users u ON u.id = s.user_id
    JOIN persons p ON p.id = u.person_id
    JOIN student_programs sp ON sp.uid = p.uid AND sp.current_flag = 1
    JOIN programs pr ON pr.id = sp.program_id
    WHERE (s.reg_no LIKE 'PENDING%' OR s.reg_no LIKE 'STD%' OR s.reg_no NOT LIKE 'BMI/%/%/%')
  );

-- Step 3: Build a temp queue of students to backfill (only those Step 2 just tagged)
CREATE TEMPORARY TABLE IF NOT EXISTS _regno_backfill_queue AS
SELECT
  s.user_id,
  p.uid,
  sp.program_id,
  pr.code AS program_code,
  COALESCE(ac.code, UPPER(REPLACE(pr.level, ' ', ''))) AS career_code
FROM students s
JOIN users u ON u.id = s.user_id
JOIN persons p ON p.id = u.person_id
JOIN student_programs sp ON sp.uid = p.uid AND sp.current_flag = 1
JOIN programs pr ON pr.id = sp.program_id
LEFT JOIN academic_careers ac ON ac.code = pr.career_code
WHERE s.previous_reg_no IS NOT NULL
  AND s.reg_no NOT LIKE 'BMI/%/%/%';

-- Step 4: Seed regno_counters for program/year combos not yet in the table
INSERT INTO regno_counters (program_id, admission_year, last_serial)
SELECT DISTINCT q.program_id, 2026, 0
FROM _regno_backfill_queue q
WHERE NOT EXISTS (
  SELECT 1 FROM regno_counters rc
  WHERE rc.program_id = q.program_id AND rc.admission_year = 2026
);

-- Step 5: Add the batch size to each counter (so a single write covers all rows)
UPDATE regno_counters
SET last_serial = last_serial + (
  SELECT COUNT(*) FROM _regno_backfill_queue q
  WHERE q.program_id = regno_counters.program_id
)
WHERE admission_year = 2026
  AND program_id IN (SELECT DISTINCT program_id FROM _regno_backfill_queue);

-- Step 6: Assign the new reg_nos using computed serial positions
UPDATE students
SET reg_no = (
    SELECT
      'BMI/' || q.career_code || '-' || q.program_code || '/226/' ||
      SUBSTR('000' || (
        SELECT rc.last_serial - (
          SELECT COUNT(*) FROM _regno_backfill_queue q2
          WHERE q2.program_id = q.program_id AND q2.uid <= q.uid
        ) + 1
      ), -3)
    FROM _regno_backfill_queue q
    WHERE q.user_id = students.user_id
),
updated_at = datetime('now')
WHERE user_id IN (SELECT user_id FROM _regno_backfill_queue);

-- Step 7: Sync registration_number on student_programs
UPDATE student_programs
SET registration_number = (
    SELECT s.reg_no FROM students s
    JOIN users u ON u.id = s.user_id
    JOIN persons p ON p.id = u.person_id
    WHERE p.uid = student_programs.uid
),
updated_at = datetime('now')
WHERE uid IN (SELECT uid FROM _regno_backfill_queue) AND current_flag = 1;

-- Step 8: Audit trail — log every change
INSERT OR IGNORE INTO code_generation_logs (id, code_type, generated_code, context, created_at)
SELECT
  lower(hex(randomblob(16))),
  'reg_no',
  s.reg_no,
  json_object(
    'migration', '0037_regno_backfill',
    'user_id', s.user_id,
    'previous_reg_no', s.previous_reg_no
  ),
  datetime('now')
FROM students s
WHERE s.previous_reg_no IS NOT NULL;

-- Step 9: Cleanup
DROP TABLE IF EXISTS _regno_backfill_queue;

-- Done
SELECT 'Backfill complete.' AS result, COUNT(*) AS students_migrated
FROM students WHERE previous_reg_no IS NOT NULL;
