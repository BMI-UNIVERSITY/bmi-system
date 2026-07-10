-- Migration: 0023_academic_careers_schools
-- Adds configurable academic careers, schools hierarchy, notification templates,
-- prerequisite tracking, and code generation audit logging.

-- 1. ACADEMIC CAREERS
-- Configurable lookup table so career codes (UG, PG, DR, CE) drive reg_no format
-- instead of the hardcoded level string.
CREATE TABLE IF NOT EXISTS academic_careers (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO academic_careers (code, name, description, sort_order) VALUES
  ('UG', 'Undergraduate', 'Bachelor degrees, diplomas, certificates', 10),
  ('PG', 'Postgraduate', 'Master degrees, postgraduate diplomas',     20),
  ('DR', 'Doctoral',     'PhD, professional doctorates',              30),
  ('CE', 'Continuing Education', 'Short courses, CPD, professional certifications', 40);

-- Add career_code FK to programs (nullable at first — populated by backfill below)
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_career_code_to_programs'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('programs') WHERE name = 'career_code');
ALTER TABLE programs ADD COLUMN career_code TEXT REFERENCES academic_careers(code);

-- Backfill career_code based on existing level values
UPDATE programs SET career_code = 'UG' WHERE level = 'undergraduate' AND career_code IS NULL;
UPDATE programs SET career_code = 'PG' WHERE level = 'graduate'      AND career_code IS NULL;
UPDATE programs SET career_code = 'DR' WHERE level = 'doctorate'     AND career_code IS NULL;
UPDATE programs SET career_code = 'CE' WHERE level = 'certificate'   AND career_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_programs_career ON programs(career_code);

-- 2. SCHOOLS
-- Middle tier: Faculty → School → Department
CREATE TABLE IF NOT EXISTS schools (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  faculty_id TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  dean_id    TEXT REFERENCES users(id),
  description TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO _migrations (name) SELECT 'add_school_id_to_departments'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('departments') WHERE name = 'school_id');
ALTER TABLE departments ADD COLUMN school_id TEXT REFERENCES schools(id);

CREATE INDEX IF NOT EXISTS idx_departments_school ON departments(school_id);

-- 3. NOTIFICATION TEMPLATES
-- Configurable email/notification bodies so messages aren't hardcoded in TypeScript.
CREATE TABLE IF NOT EXISTS notification_templates (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  template_key TEXT UNIQUE NOT NULL,
  subject     TEXT NOT NULL,
  body_html   TEXT NOT NULL,
  body_text   TEXT,
  variables   TEXT NOT NULL DEFAULT '[]',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. PREREQUISITES ON PROGRAM COURSES
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_prerequisite_ids_to_program_courses'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('program_courses') WHERE name = 'prerequisite_ids');
ALTER TABLE program_courses ADD COLUMN prerequisite_ids TEXT;
-- JSON array of course IDs, e.g. '["csc101-id","mat110-id"]'

-- 5. CODE GENERATION AUDIT LOG
-- Tracks every UID, reg_no, and app_number generation event.
CREATE TABLE IF NOT EXISTS code_generation_logs (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code_type      TEXT NOT NULL CHECK(code_type IN ('uid', 'reg_no', 'app_number')),
  generated_code TEXT NOT NULL,
  context        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_code_gen_type ON code_generation_logs(code_type);
CREATE INDEX IF NOT EXISTS idx_code_gen_created ON code_generation_logs(created_at);
