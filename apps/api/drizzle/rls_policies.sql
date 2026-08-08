-- =============================================================================
-- BMI University System — PostgreSQL Row-Level Security Policies
-- Phase 7: RLS & Production Cutover
--
-- Apply with:
--   psql "$DATABASE_URL_CORE" -f drizzle/rls_policies.sql
--
-- Design notes:
--   • request.jwt.claim.sub   = the authenticated user's UUID (set per-request by setRequestContext)
--   • request.jwt.claim.role  = 'admin' | 'staff' | 'student' | 'applicant' | 'alumni'
--   • Admin and staff roles bypass all row-level restrictions (USING true).
--   • current_setting(..., true) returns '' when the GUC is not set, so
--     unauthenticated Worker invocations never accidentally match a real user id.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper function: returns the current request role ('' when not set)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE PARALLEL SAFE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), '');
$$;

-- Helper function: returns the current request user id ('' when not set)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS text
LANGUAGE sql
STABLE PARALLEL SAFE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.sub', true), '');
$$;

-- Helper function: true when caller is admin or staff
CREATE OR REPLACE FUNCTION is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
STABLE PARALLEL SAFE
AS $$
  SELECT current_user_role() = ANY(ARRAY['admin', 'staff']);
$$;

-- =============================================================================
-- USERS table
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Force RLS for table owners too (prevents accidental bypass in migrations)
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Admin/staff: full access
CREATE POLICY users_admin_access ON users
  FOR ALL
  USING (is_admin_or_staff());

-- Self: read and update own row only
CREATE POLICY users_self_select ON users
  FOR SELECT
  USING (id::text = current_user_id());

CREATE POLICY users_self_update ON users
  FOR UPDATE
  USING (id::text = current_user_id())
  WITH CHECK (id::text = current_user_id());

-- =============================================================================
-- APPLICATIONS table
-- =============================================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications FORCE ROW LEVEL SECURITY;

-- Admin/staff: full access
CREATE POLICY applications_admin_access ON applications
  FOR ALL
  USING (is_admin_or_staff());

-- Applicants/students: own applications only
CREATE POLICY applications_owner_select ON applications
  FOR SELECT
  USING (user_id::text = current_user_id());

CREATE POLICY applications_owner_insert ON applications
  FOR INSERT
  WITH CHECK (user_id::text = current_user_id());

CREATE POLICY applications_owner_update ON applications
  FOR UPDATE
  USING (user_id::text = current_user_id() AND status IN ('draft'))
  WITH CHECK (user_id::text = current_user_id());

-- =============================================================================
-- APPLICATION_STATUS_LOGS table
-- =============================================================================
ALTER TABLE application_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY app_logs_admin_access ON application_status_logs
  FOR ALL
  USING (is_admin_or_staff());

CREATE POLICY app_logs_owner_select ON application_status_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_status_logs.application_id
        AND a.user_id::text = current_user_id()
    )
  );

-- =============================================================================
-- STUDENT_PROFILES table
-- =============================================================================
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY student_profiles_admin_access ON student_profiles
  FOR ALL
  USING (is_admin_or_staff());

CREATE POLICY student_profiles_self_access ON student_profiles
  FOR ALL
  USING (student_id::text = current_user_id());

-- =============================================================================
-- GRADES table
-- =============================================================================
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades FORCE ROW LEVEL SECURITY;

CREATE POLICY grades_admin_access ON grades
  FOR ALL
  USING (is_admin_or_staff());

-- Students: read their own grades only
CREATE POLICY grades_student_select ON grades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.id = grades.enrollment_id
        AND e.student_id::text = current_user_id()
    )
  );

-- =============================================================================
-- ENROLLMENTS table
-- =============================================================================
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;

CREATE POLICY enrollments_admin_access ON enrollments
  FOR ALL
  USING (is_admin_or_staff());

CREATE POLICY enrollments_student_select ON enrollments
  FOR SELECT
  USING (student_id::text = current_user_id());

-- =============================================================================
-- INVOICES table
-- =============================================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY invoices_admin_access ON invoices
  FOR ALL
  USING (is_admin_or_staff());

CREATE POLICY invoices_student_select ON invoices
  FOR SELECT
  USING (student_id::text = current_user_id());

-- =============================================================================
-- SESSIONS table — no cross-user visibility ever
-- =============================================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY sessions_admin_access ON sessions
  FOR ALL
  USING (is_admin_or_staff());

CREATE POLICY sessions_self_access ON sessions
  FOR ALL
  USING (user_id::text = current_user_id());

-- =============================================================================
-- STUDENT_HOLDS table
-- =============================================================================
ALTER TABLE student_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_holds FORCE ROW LEVEL SECURITY;

CREATE POLICY student_holds_admin_access ON student_holds
  FOR ALL
  USING (is_admin_or_staff());

CREATE POLICY student_holds_student_select ON student_holds
  FOR SELECT
  USING (student_id::text = current_user_id());


-- =============================================================================
-- ADMIN_AUDIT_LOGS — admin/staff read; system inserts only (no user self-read)
-- =============================================================================
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_admin_access ON admin_audit_logs
  FOR ALL
  USING (is_admin_or_staff());

-- =============================================================================
-- Tables with NO sensitive user data — read-open, write-admin-only
-- (programs, faculties, departments, courses, academic_terms, etc.)
-- =============================================================================
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY programs_read_all   ON programs FOR SELECT USING (true);
CREATE POLICY programs_write_admin ON programs FOR ALL   USING (is_admin_or_staff());

ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
CREATE POLICY faculties_read_all   ON faculties FOR SELECT USING (true);
CREATE POLICY faculties_write_admin ON faculties FOR ALL  USING (is_admin_or_staff());

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY departments_read_all   ON departments FOR SELECT USING (true);
CREATE POLICY departments_write_admin ON departments FOR ALL  USING (is_admin_or_staff());

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY courses_read_all   ON courses FOR SELECT USING (true);
CREATE POLICY courses_write_admin ON courses FOR ALL  USING (is_admin_or_staff());

ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY terms_read_all   ON academic_terms FOR SELECT USING (true);
CREATE POLICY terms_write_admin ON academic_terms FOR ALL  USING (is_admin_or_staff());

-- =============================================================================
-- Verification query — run after applying policies to confirm they are active
-- =============================================================================
-- SELECT schemaname, tablename, rowsecurity, forcerowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND rowsecurity = true
-- ORDER BY tablename;
