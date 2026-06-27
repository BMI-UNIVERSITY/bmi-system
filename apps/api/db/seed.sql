
-- Wipe existing data
DELETE FROM password_reset_tokens;
DELETE FROM email_verifications;
DELETE FROM sessions;
DELETE FROM admin_audit_logs;
DELETE FROM application_status_logs;
DELETE FROM recommendation_requests;
DELETE FROM documents;
DELETE FROM applications;
DELETE FROM enrollments;
DELETE FROM courses;
DELETE FROM invoices;
DELETE FROM cms_pages;
DELETE FROM cms_posts;
DELETE FROM cms_media;
DELETE FROM student_settings;
DELETE FROM support_tickets;
DELETE FROM sync_event_log;
DELETE FROM webhook_dead_letters;
DELETE FROM students;
DELETE FROM staff;
DELETE FROM faculties;
DELETE FROM departments;
DELETE FROM programs;
DELETE FROM academic_terms;
DELETE FROM grades;
DELETE FROM certificates;
DELETE FROM users;

-- Insert SuperAdmin
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified)
VALUES ('9209cd38-fb39-439f-a80f-3ee844d03c5c', 'superadmin@bmi.edu', 'pbkdf2:6a933d6df4ddc7732d80292d3b27f8ea:6587113b7e0834a9f69b90ac31c020051c5a588434008e8403a0212337f445b6', 'Super', 'Admin', 'admin', 1);
