-- Migration number: 0014 - Database Performance Optimization
-- Adds critical indexes for registration and application submission flows
-- Date: 2024-12-19

-- Performance indexes for registration flow
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email, is_verified);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, is_verified);

-- Application submission performance indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_applications_program_level ON applications(program, degree_level);
CREATE INDEX IF NOT EXISTS idx_applications_number_status ON applications(application_number, status) WHERE application_number IS NOT NULL;

-- Document upload performance
CREATE INDEX IF NOT EXISTS idx_documents_app_type ON documents(application_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);

-- Session and authentication performance
CREATE INDEX IF NOT EXISTS idx_sessions_expires_user ON sessions(expires_at, user_id);
CREATE INDEX IF NOT EXISTS idx_email_verif_expires ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_expires ON password_reset_tokens(expires_at);

-- Rate limiting performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(ip_address, endpoint, window_start);

-- Lifecycle and provisioning performance  
CREATE INDEX IF NOT EXISTS idx_lifecycle_status_stage ON lifecycle_events(status, stage);
CREATE INDEX IF NOT EXISTS idx_lifecycle_idempotency ON lifecycle_events(idempotency_key, status);
CREATE INDEX IF NOT EXISTS idx_provisioning_status_type ON provisioning_jobs(status, job_type);
CREATE INDEX IF NOT EXISTS idx_provisioning_created ON provisioning_jobs(created_at);

-- Student/Staff performance indexes
CREATE INDEX IF NOT EXISTS idx_students_reg_status ON students(reg_no, status);
CREATE INDEX IF NOT EXISTS idx_students_programme_status ON students(program_id, status);
CREATE INDEX IF NOT EXISTS idx_student_programs_admission ON student_programs(admission_year, status);

-- Composite indexes for common JOIN patterns
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course ON enrollments(student_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_grades_enrollment_type ON grades(enrollment_id, assessment_type);

-- Admin audit performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_user_action ON admin_audit_logs(user_id, action, created_at);

-- CMS performance indexes
CREATE INDEX IF NOT EXISTS idx_cms_posts_status_published ON cms_posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status_slug ON cms_pages(status, slug);

-- Cleanup expired tokens (maintenance query optimization)
CREATE INDEX IF NOT EXISTS idx_oauth_expires ON oauth_accounts(expires_at) WHERE expires_at IS NOT NULL;