
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
VALUES ('34001b3c-9828-4608-b801-ead96ba7b5c0', 'bmiuniversity8@gmail.com', 'pbkdf2:49dd852941f4997b08c9975725dfef4c:eee1e060f023d7f6938fff1dad2f1df86624caba67705ec45fd8d21b6c22fc92', 'Super', 'Admin', 'admin', 1);
