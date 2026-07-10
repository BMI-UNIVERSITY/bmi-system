-- Migration: 0027_student_uid_link
-- Links students directly to persons.uid for permanent identification
-- independent of user accounts. Also adds student_profiles for extended data.

-- 1. Add uid to students (direct link to persons, not via users)
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_uid_to_students'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('students') WHERE name = 'uid');
ALTER TABLE students ADD COLUMN uid TEXT REFERENCES persons(uid);

-- Backfill uid from persons via the users join
UPDATE students
SET uid = (
  SELECT p.uid
  FROM users u
  JOIN persons p ON u.person_id = p.id
  WHERE u.id = students.user_id
)
WHERE uid IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_uid ON students(uid);

-- 2. STUDENT PROFILES (extended profile data separate from auth)
CREATE TABLE IF NOT EXISTS student_profiles (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id        TEXT NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
  preferred_name    TEXT,
  emergency_contact TEXT,
  emergency_phone   TEXT,
  dietary_restrictions TEXT,
  disability_info   TEXT,
  previous_education TEXT,
  employment_status TEXT,
  metadata          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id)
);
