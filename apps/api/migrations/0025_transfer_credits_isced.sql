-- Migration: 0025_transfer_credits_isced
-- Adds credit transfer/advanced standing tracking and ISCED program classification.

-- 1. ISCED FIELDS OF EDUCATION
-- International Standard Classification of Education taxonomy for programs.
CREATE TABLE IF NOT EXISTS isced_fields (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO isced_fields (code, name) VALUES
  ('01', 'Education'),
  ('02', 'Arts and Humanities'),
  ('022', 'Humanities (except languages)'),
  ('0221', 'Religion and Theology'),
  ('03', 'Social Sciences, Journalism and Information'),
  ('04', 'Business, Administration and Law'),
  ('042', 'Law'),
  ('05', 'Natural Sciences, Mathematics and Statistics'),
  ('06', 'Information and Communication Technologies'),
  ('07', 'Engineering, Manufacturing and Construction'),
  ('08', 'Agriculture, Forestry, Fisheries and Veterinary'),
  ('09', 'Health and Welfare'),
  ('10', 'Services');

-- Add isced_code to programs
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_isced_code_to_programs'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('programs') WHERE name = 'isced_code');
ALTER TABLE programs ADD COLUMN isced_code TEXT REFERENCES isced_fields(code);

CREATE INDEX IF NOT EXISTS idx_programs_isced ON programs(isced_code);

-- 2. TRANSFER CREDITS
-- Tracks credits transferred from external institutions, previous programs, exams,
-- or recognised work experience toward a BMI program.
CREATE TABLE IF NOT EXISTS transfer_credits (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type          TEXT NOT NULL CHECK(source_type IN ('institution', 'previous_program', 'exam', 'work_experience')),
  source_name          TEXT NOT NULL,
  source_course_code   TEXT,
  source_course_title  TEXT,
  source_credits       REAL NOT NULL,
  awarded_credits      REAL NOT NULL DEFAULT 0,
  equivalent_course_id TEXT REFERENCES courses(id),
  recipient_program_id TEXT REFERENCES programs(id),
  term_id              TEXT REFERENCES academic_terms(id),
  decision             TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending', 'approved', 'rejected')),
  reviewed_by          TEXT REFERENCES users(id),
  review_notes         TEXT,
  metadata             TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transfer_credits_student ON transfer_credits(student_id);
CREATE INDEX IF NOT EXISTS idx_transfer_credits_decision ON transfer_credits(decision);
CREATE INDEX IF NOT EXISTS idx_transfer_credits_program ON transfer_credits(recipient_program_id);

-- 3. ADVANCED STANDING / EXEMPTIONS
-- Tracks individual course exemptions — a student is excused from taking a specific
-- BMI course based on prior learning, without necessarily receiving credit for it.
CREATE TABLE IF NOT EXISTS advanced_standing (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id  TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  standing_type TEXT NOT NULL CHECK(standing_type IN ('exemption', 'acceleration', 'credit_by_exam', 'waiver')),
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_advanced_standing_student ON advanced_standing(student_id);
CREATE INDEX IF NOT EXISTS idx_advanced_standing_program ON advanced_standing(program_id);
