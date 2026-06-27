CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'applicant' CHECK(role IN ('applicant', 'student', 'staff', 'admin')),
  is_verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  mfa_secret  TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

CREATE TABLE IF NOT EXISTS applications (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program         TEXT NOT NULL,
  degree_level    TEXT NOT NULL CHECK(degree_level IN ('undergraduate','graduate','doctorate','certificate')),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','under_review','accepted','rejected','waitlisted')),
  personal_statement TEXT,
  prior_education TEXT CHECK(prior_education IS NULL OR json_valid(prior_education)),
  submitted_at    TEXT,
  reviewed_at     TEXT,
  reviewer_id     TEXT REFERENCES users(id),
  reviewer_notes  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_apps_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_status  ON applications(status);

CREATE TABLE IF NOT EXISTS documents (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id  TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL CHECK(doc_type IN ('transcript','id_document','personal_statement','recommendation','other')),
  file_name       TEXT NOT NULL,
  r2_key          TEXT NOT NULL UNIQUE,
  mime_type       TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_docs_application_id ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_docs_user_id        ON documents(user_id);

CREATE TABLE IF NOT EXISTS recommendation_requests (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id  TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  referee_name    TEXT NOT NULL,
  referee_email   TEXT NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'submitted')),
  document_id     TEXT REFERENCES documents(id) ON DELETE SET NULL,
  requested_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_recs_app_id ON recommendation_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_recs_token ON recommendation_requests(token);

CREATE TABLE IF NOT EXISTS application_status_logs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id  TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  changed_by      TEXT NOT NULL REFERENCES users(id),
  old_status      TEXT,
  new_status      TEXT NOT NULL,
  notes           TEXT,
  changed_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_status_logs_app_id ON application_status_logs(application_id);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  target_type     TEXT,
  target_id       TEXT,
  details         TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip_address  TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  window_start TEXT NOT NULL DEFAULT (datetime('now')),
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_address, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address, window_start);

CREATE TABLE IF NOT EXISTS email_verifications (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  expires_at      TEXT NOT NULL,
  verified_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_verif_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verif_token ON email_verifications(token);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  expires_at      TEXT NOT NULL,
  used_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON password_reset_tokens(token);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  provider_id        TEXT NOT NULL,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  expires_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_id);

CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO app_config (key, value) VALUES ('max_applications_per_user', '3');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('min_password_length', '8');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('require_verified_email', 'true');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('application_deadline', '');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('session_ttl_seconds', '604800');

-- Phase 2: Student Portal Tables
CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  credits     INTEGER NOT NULL,
  term        TEXT NOT NULL,
  capacity    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'enrolled' CHECK(status IN ('enrolled', 'dropped', 'waitlisted')),
  grade       TEXT,
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

CREATE TABLE IF NOT EXISTS invoices (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'paid')),
  due_date    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);

-- Seed Courses
INSERT OR IGNORE INTO courses (code, title, description, credits, term, capacity) VALUES 
('CS101', 'Introduction to Computer Science', 'Learn the basics of programming and algorithms.', 3, 'Fall 2026', 150),
('BUS201', 'Business Ethics', 'Explore ethical dilemmas in modern business environments.', 3, 'Fall 2026', 100),
('ENG105', 'Academic Writing', 'Develop advanced writing and research skills.', 3, 'Fall 2026', 200),
('MATH210', 'Calculus I', 'Limits, derivatives, and integrals of functions of a single variable.', 4, 'Fall 2026', 120),
('PHY101', 'Physics for Engineers', 'Mechanics, heat, and sound.', 4, 'Fall 2026', 80);

-- CMS Tables
CREATE TABLE IF NOT EXISTS cms_pages (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  content         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  author_id       TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  published_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);

CREATE TABLE IF NOT EXISTS cms_posts (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  excerpt         TEXT,
  content         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  author_id       TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  published_at    TEXT,
  tags            TEXT CHECK(tags IS NULL OR json_valid(tags)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cms_posts_slug ON cms_posts(slug);
CREATE INDEX IF NOT EXISTS idx_cms_posts_status ON cms_posts(status);
CREATE INDEX IF NOT EXISTS idx_cms_posts_published_at ON cms_posts(published_at);

CREATE TABLE IF NOT EXISTS cms_media (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title           TEXT NOT NULL,
  description     TEXT,
  r2_key          TEXT NOT NULL UNIQUE,
  mime_type       TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  uploader_id     TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cms_media_uploader ON cms_media(uploader_id);

-- Phase 3: Student Portal Enhancements
CREATE TABLE IF NOT EXISTS student_settings (
  student_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  directory_release     INTEGER NOT NULL DEFAULT 1,
  communications_opt_in INTEGER NOT NULL DEFAULT 1,
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_student ON support_tickets(student_id);

-- Phase 4: Integration / Sync Layer
CREATE TABLE IF NOT EXISTS sync_event_log (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_type   TEXT NOT NULL,
  payload      TEXT NOT NULL CHECK(json_valid(payload)),
  target_url   TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed','dead')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_event_log_status ON sync_event_log(status);
CREATE INDEX IF NOT EXISTS idx_event_log_type   ON sync_event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_created ON sync_event_log(created_at);

CREATE TABLE IF NOT EXISTS webhook_dead_letters (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_log_id TEXT NOT NULL REFERENCES sync_event_log(id) ON DELETE CASCADE,
  payload      TEXT NOT NULL,
  last_error   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dead_letters_event ON webhook_dead_letters(event_log_id);

-- Phase 5: UMS Unified Schema Additions

-- 1. Student Profiles (Extends users table for admitted students)
CREATE TABLE IF NOT EXISTS students (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reg_no          TEXT UNIQUE NOT NULL,
  gender          TEXT,
  date_of_birth   TEXT,
  nationality     TEXT,
  admission_date  TEXT NOT NULL,
  programme       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive', 'Graduated', 'Suspended', 'Applicant')),
  avatar_color    TEXT,
  study_center_id TEXT,
  gpa             REAL,
  year_of_study   INTEGER,
  graduation_date TEXT,
  degree_level    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_students_reg_no ON students(reg_no);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- 2. Staff Profiles (Extends users table for faculty and admins)
CREATE TABLE IF NOT EXISTS staff (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  staff_no        TEXT UNIQUE NOT NULL,
  department_id   TEXT,
  designation     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Academic Structure
CREATE TABLE IF NOT EXISTS faculties (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name            TEXT NOT NULL,
  code            TEXT UNIQUE NOT NULL,
  dean_id         TEXT REFERENCES users(id),
  description     TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS departments (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name            TEXT NOT NULL,
  code            TEXT UNIQUE NOT NULL,
  faculty_id      TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  head_id         TEXT REFERENCES users(id),
  description     TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS programs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name            TEXT NOT NULL,
  code            TEXT UNIQUE NOT NULL,
  degree_type     TEXT NOT NULL,
  level           TEXT NOT NULL,
  department_id   TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  duration_years  INTEGER NOT NULL,
  total_credit_hours INTEGER NOT NULL,
  mode_of_study   TEXT NOT NULL,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS academic_terms (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name            TEXT NOT NULL,
  code            TEXT UNIQUE NOT NULL,
  academic_year   TEXT NOT NULL,
  semester_number INTEGER NOT NULL,
  start_date      TEXT NOT NULL,
  end_date        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'registration', 'active', 'exam', 'grading', 'closed')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Alter existing courses and enrollments
ALTER TABLE courses ADD COLUMN department_id TEXT REFERENCES departments(id);
ALTER TABLE courses ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

ALTER TABLE enrollments ADD COLUMN term_id TEXT REFERENCES academic_terms(id);
ALTER TABLE enrollments ADD COLUMN registration_date TEXT NOT NULL DEFAULT (datetime('now'));

-- 5. Grades
CREATE TABLE IF NOT EXISTS grades (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  enrollment_id   TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL,
  score           REAL NOT NULL,
  max_score       REAL NOT NULL,
  graded_by       TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grades_enrollment ON grades(enrollment_id);

-- 6. Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  serial_number   TEXT UNIQUE NOT NULL,
  degree_title    TEXT NOT NULL,
  issue_date      TEXT NOT NULL,
  gpa             REAL,
  status          TEXT NOT NULL DEFAULT 'ISSUED' CHECK(status IN ('ISSUED', 'REVOKED', 'SUSPENDED')),
  content_hash    TEXT NOT NULL,
  verification_count INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_serial ON certificates(serial_number);
