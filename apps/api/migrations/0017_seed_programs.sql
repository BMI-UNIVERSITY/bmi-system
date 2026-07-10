-- Migration: 0017_seed_programs.sql
-- Seeds the faculties, departments, and programs tables so that
-- executeAdmissionPipelineOptimized can resolve a real registration number
-- for accepted students.  Without this seed every accept leaves the student
-- with reg_no = 'PENDING-XXXXXXXX' forever.
--
-- Programs are kept in sync with packages/shared/src/programs.ts.
-- If you add a program there, add a matching INSERT here.

-- ── Faculty ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO faculties (id, name, code, description, is_active)
VALUES (
  'fac-theology-00000000000000000',
  'Faculty of Theology and Ministry',
  'FTM',
  'BMI University core faculty offering undergraduate, graduate, and doctoral programs in theology, ministry, and Christian studies.',
  1
);

-- ── Department ──────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO departments (id, name, code, faculty_id, description, is_active)
VALUES (
  'dep-theology-00000000000000000',
  'Department of Theology and Ministry Studies',
  'DTMS',
  'fac-theology-00000000000000000',
  'Houses all degree and certificate programs offered by BMI University.',
  1
);

-- ── Programs ─────────────────────────────────────────────────────────────────
-- name      must match the `program` field stored in applications exactly
-- code      used as the program prefix in registration numbers
-- level     must match VALID_LEVELS: undergraduate | graduate | doctorate | certificate
-- degree_type  human-readable abbreviation (BA, MA, MDiv, etc.)

-- Undergraduate
INSERT OR IGNORE INTO programs (id, name, code, degree_type, level, department_id, duration_years, total_credit_hours, mode_of_study, is_active)
VALUES
  ('prg-ba-biblical-00000000000000', 'BA in Biblical Studies',      'BABS',  'BA',    'undergraduate', 'dep-theology-00000000000000000', 4, 120, 'Full-Time', 1),
  ('prg-ba-christian-ed-0000000000', 'BA in Christian Education',   'BACE',  'BA',    'undergraduate', 'dep-theology-00000000000000000', 4, 120, 'Full-Time', 1),
  ('prg-ba-ministry-000000000000000', 'BA in Ministry Leadership',  'BAML',  'BA',    'undergraduate', 'dep-theology-00000000000000000', 4, 120, 'Full-Time', 1),
  ('prg-ba-theological-00000000000', 'BA in Theological Studies',   'BATS',  'BA',    'undergraduate', 'dep-theology-00000000000000000', 4, 120, 'Full-Time', 1),
  ('prg-ba-worship-0000000000000000', 'BA in Worship Leadership',   'BAWL',  'BA',    'undergraduate', 'dep-theology-00000000000000000', 4, 120, 'Full-Time', 1),

-- Graduate
  ('prg-mdiv-0000000000000000000000', 'Master of Divinity (MDiv)',  'MDIV',  'MDiv',  'graduate',      'dep-theology-00000000000000000', 3,  90, 'Full-Time', 1),
  ('prg-ma-counseling-000000000000', 'MA in Christian Counseling',  'MACC',  'MA',    'graduate',      'dep-theology-00000000000000000', 2,  60, 'Full-Time', 1),
  ('prg-ma-theology-0000000000000000', 'MA in Theology',            'MATH',  'MA',    'graduate',      'dep-theology-00000000000000000', 2,  60, 'Full-Time', 1),
  ('prg-ma-christian-ed-000000000000', 'MA in Christian Education', 'MACE',  'MA',    'graduate',      'dep-theology-00000000000000000', 2,  60, 'Full-Time', 1),
  ('prg-ma-apologetics-00000000000', 'MA in Christian Apologetics', 'MACA',  'MA',    'graduate',      'dep-theology-00000000000000000', 2,  60, 'Full-Time', 1),
  ('prg-ma-leadership-000000000000', 'MA in Christian Leadership',  'MACL',  'MA',    'graduate',      'dep-theology-00000000000000000', 2,  60, 'Full-Time', 1),

-- Doctorate
  ('prg-dmin-0000000000000000000000', 'Doctor of Ministry (DMin)',  'DMIN',  'DMin',  'doctorate',     'dep-theology-00000000000000000', 3,  60, 'Full-Time', 1),
  ('prg-thd-00000000000000000000000', 'Doctor of Theology (ThD)',   'THD',   'ThD',   'doctorate',     'dep-theology-00000000000000000', 4,  90, 'Full-Time', 1),
  ('prg-dce-00000000000000000000000', 'Doctor of Christian Education', 'DCE', 'DCE',  'doctorate',     'dep-theology-00000000000000000', 4,  90, 'Full-Time', 1),

-- Graduate Certificates
  ('prg-cert-biblical-000000000000', 'Graduate Certificate in Biblical Studies',    'GCBS', 'Certificate', 'certificate', 'dep-theology-00000000000000000', 1, 18, 'Part-Time', 1),
  ('prg-cert-christian-00000000000', 'Graduate Certificate in Christian Studies',   'GCCS', 'Certificate', 'certificate', 'dep-theology-00000000000000000', 1, 18, 'Part-Time', 1),
  ('prg-cert-spiritual-00000000000', 'Graduate Certificate in Spiritual Formation', 'GCSF', 'Certificate', 'certificate', 'dep-theology-00000000000000000', 1, 18, 'Part-Time', 1);
