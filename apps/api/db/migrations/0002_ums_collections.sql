-- ============================================================================
-- BMI UMS — Missing Collections Migration
-- Run: npx wrangler d1 execute bmi-portal-db --remote --file=db/migrations/0002_ums_collections.sql
-- ============================================================================

-- ── 1. Study Centers (Campuses) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_centers (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name         TEXT NOT NULL,
  code         TEXT UNIQUE,
  location     TEXT,
  address      TEXT,
  phone        TEXT,
  email        TEXT,
  director_id  TEXT REFERENCES users(id),
  capacity     INTEGER DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 2. Library Books / Resources ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_books (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title        TEXT NOT NULL,
  author       TEXT NOT NULL,
  isbn         TEXT,
  category     TEXT NOT NULL DEFAULT 'General' CHECK(category IN ('Theology','ICT','Business','Education','General')),
  type         TEXT NOT NULL DEFAULT 'Hardcopy' CHECK(type IN ('PDF','E-Book','Hardcopy','Journal','Video')),
  status       TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Digital','Available','Borrowed','Reserved')),
  year         TEXT,
  description  TEXT,
  download_url TEXT,
  location     TEXT,
  copies       INTEGER NOT NULL DEFAULT 1,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 3. Hostels ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostels (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'Male' CHECK(type IN ('Male','Female','Mixed')),
  capacity     INTEGER NOT NULL DEFAULT 0,
  occupied     INTEGER NOT NULL DEFAULT 0,
  location     TEXT,
  status       TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available','Near Capacity','Full')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 4. Hostel Room Assignments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostel_room_assignments (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hostel_id     TEXT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number   TEXT NOT NULL,
  check_in_date TEXT NOT NULL,
  check_out_date TEXT,
  status        TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Revoked','Completed')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 5. Medical Records ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition_name   TEXT NOT NULL,
  blood_type       TEXT,
  visit_date       TEXT NOT NULL DEFAULT (datetime('now')),
  attending_staff  TEXT,
  status           TEXT NOT NULL DEFAULT 'Normal' CHECK(status IN ('Normal','Urgent','Follow-up')),
  vitals           TEXT DEFAULT '{}',   -- JSON: { temp, bp, pulse }
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 6. Inventory Items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name          TEXT NOT NULL,
  category      TEXT,
  quantity      INTEGER NOT NULL DEFAULT 0,
  unit          TEXT DEFAULT 'pcs',
  location      TEXT,
  status        TEXT NOT NULL DEFAULT 'In Stock' CHECK(status IN ('In Stock','Low Stock','Out of Stock','Damaged')),
  cost_per_unit REAL DEFAULT 0,
  supplier      TEXT,
  last_restocked TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 7. Visitors Log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitors (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  full_name     TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  id_type       TEXT DEFAULT 'National ID',
  id_number     TEXT,
  purpose       TEXT NOT NULL,
  host_name     TEXT,
  host_department TEXT,
  check_in      TEXT NOT NULL DEFAULT (datetime('now')),
  check_out     TEXT,
  status        TEXT NOT NULL DEFAULT 'Checked In' CHECK(status IN ('Checked In','Checked Out')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 8. Attendance Records ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     TEXT REFERENCES courses(id) ON DELETE SET NULL,
  term_id       TEXT REFERENCES academic_terms(id) ON DELETE SET NULL,
  date          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Present' CHECK(status IN ('Present','Absent','Late','Excused')),
  remarks       TEXT,
  recorded_by   TEXT REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Indexes for performance ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hostel_assignments_student ON hostel_room_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_assignments_hostel  ON hostel_room_assignments(hostel_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_student    ON medical_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student         ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course          ON attendance_records(course_id);
CREATE INDEX IF NOT EXISTS idx_library_category           ON library_books(category);
CREATE INDEX IF NOT EXISTS idx_visitors_checkin           ON visitors(check_in);
