-- Migration: 0024_course_sections
-- Adds section-level course offering: a course may have multiple sections
-- per term (e.g., "CSC101 — Section A MWF 9am", "Section B MWF 10am").
-- Each section has its own capacity, instructor, room, and schedule.

-- 1. COURSE SECTIONS
CREATE TABLE IF NOT EXISTS course_sections (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  term_id      TEXT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  section_code TEXT NOT NULL,
  instructor_id TEXT REFERENCES users(id),
  capacity     INTEGER NOT NULL DEFAULT 0,
  room         TEXT,
  schedule     TEXT,
  -- JSON array of days/timeslots, e.g.
  -- [{"day":"Mon","start":"09:00","end":"10:00"},{"day":"Wed","start":"09:00","end":"10:00"}]
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, term_id, section_code)
);

CREATE INDEX IF NOT EXISTS idx_course_sections_course ON course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sections_term   ON course_sections(term_id);
CREATE INDEX IF NOT EXISTS idx_course_sections_instr   ON course_sections(instructor_id);

-- 2. Link registrations to sections (nullable — existing rows or section-less
--    enrollments remain valid)
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_section_id_to_student_course_registrations'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('student_course_registrations') WHERE name = 'section_id');
ALTER TABLE student_course_registrations ADD COLUMN section_id TEXT REFERENCES course_sections(id);

CREATE INDEX IF NOT EXISTS idx_student_course_reg_section
  ON student_course_registrations(section_id);

-- 3. Link general enrollments to sections (nullable)
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_section_id_to_enrollments'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('enrollments') WHERE name = 'section_id');
ALTER TABLE enrollments ADD COLUMN section_id TEXT REFERENCES course_sections(id);

CREATE INDEX IF NOT EXISTS idx_enrollments_section ON enrollments(section_id);
