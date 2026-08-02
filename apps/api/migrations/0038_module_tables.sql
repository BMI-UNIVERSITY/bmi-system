-- ============================================================================
-- BMI UMS — Missing Module Tables
-- Implements: HR (leave_requests, payroll), Library (borrowings, fines),
--             Alumni (profiles, events, donations), Campus (transport, passes),
--             Notifications
-- Run: npx wrangler d1 execute bmi-portal-db --local --file=migrations/0038_module_tables.sql
-- ============================================================================

-- ── 1. Leave Requests (HR) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  staff_id   TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'Annual' CHECK(type IN ('Annual','Sick','Maternity','Paternity','Study','Unpaid','Other')),
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  reason     TEXT,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff ON leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ── 2. Payroll Records (HR) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_records (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  staff_id   TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  period     TEXT NOT NULL,          -- e.g. '2024-06'
  gross      REAL NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  net        REAL NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processed','paid')),
  paid_at    TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payroll_staff ON payroll_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(period);

-- ── 3. Library Borrowings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_borrowings (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  book_id     TEXT NOT NULL REFERENCES library_books(id) ON DELETE RESTRICT,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  borrow_date TEXT NOT NULL DEFAULT (date('now')),
  due_date    TEXT NOT NULL,
  return_date TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','returned','overdue')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_borrowings_book    ON library_borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_student ON library_borrowings(student_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_status  ON library_borrowings(status);

-- ── 4. Library Fines ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_fines (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  borrowing_id TEXT NOT NULL REFERENCES library_borrowings(id) ON DELETE CASCADE,
  student_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount       REAL NOT NULL DEFAULT 0,
  reason       TEXT NOT NULL DEFAULT 'Overdue',
  paid         INTEGER NOT NULL DEFAULT 0,
  paid_at      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fines_student   ON library_fines(student_id);
CREATE INDEX IF NOT EXISTS idx_fines_borrowing ON library_fines(borrowing_id);

-- ── 5. Alumni Profiles ────────────────────────────────────────────────────────
-- (Extends the users table — alumni role already exists.  This stores post-graduation details.)
CREATE TABLE IF NOT EXISTS alumni_profiles (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id           TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  graduation_year   INTEGER,
  program           TEXT,
  current_employer  TEXT,
  current_role      TEXT,
  linkedin_url      TEXT,
  location          TEXT,
  bio               TEXT,
  is_public         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alumni_user ON alumni_profiles(user_id);

-- ── 6. Alumni Events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alumni_events (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL,
  description TEXT,
  event_date  TEXT NOT NULL,
  location    TEXT,
  is_virtual  INTEGER NOT NULL DEFAULT 0,
  meet_link   TEXT,
  capacity    INTEGER,
  rsvp_count  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','ongoing','completed','cancelled')),
  created_by  TEXT REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alumni_events_date ON alumni_events(event_date);

-- ── 7. Alumni Donations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alumni_donations (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  alumni_id  TEXT NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
  amount     REAL NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'GHS',
  purpose    TEXT NOT NULL DEFAULT 'General',
  reference  TEXT,
  status     TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('pending','received','refunded')),
  donated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_donations_alumni ON alumni_donations(alumni_id);

-- ── 8. Transport Routes (Campus Services) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_routes (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name           TEXT NOT NULL,
  origin         TEXT NOT NULL,
  destination    TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  capacity       INTEGER NOT NULL DEFAULT 30,
  fare           REAL NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 9. Transport Passes ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_passes (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id   TEXT NOT NULL REFERENCES transport_routes(id) ON DELETE RESTRICT,
  valid_from TEXT NOT NULL,
  valid_to   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','cancelled')),
  issued_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_passes_student ON transport_passes(student_id);
CREATE INDEX IF NOT EXISTS idx_passes_route   ON transport_passes(route_id);

-- ── 10. Notifications ─────────────────────────────────────────────────────────
-- Polled every 20-30s by both portals (no realtime infra needed)
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info','success','warning','error','grade','finance','admission','system')),
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,          -- optional deep-link into the portal
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read);
