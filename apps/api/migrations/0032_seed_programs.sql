-- Migration: 0032_seed_programs
--
-- This migration seeds the canonical academic structure: Faculties -> Departments -> Programs.
-- This ensures that when a student applies for "BA in Biblical Studies", the admission
-- pipeline can successfully find the program in the database, extract its code (e.g. BBS),
-- and generate the official Registration Number (e.g. BMI/BBS/2026/001).
--
-- The program names here exactly match the `VALID_PROGRAMS` exported from `@bmi/shared`.

-- 1. Seed Faculties
INSERT OR IGNORE INTO faculties (id, name, code, description) VALUES 
('f-theology', 'Faculty of Theology and Ministry', 'FTM', 'Theological and ministry training'),
('f-education', 'Faculty of Christian Education', 'FCE', 'Equipping educators and counselors');

-- 2. Seed Departments
INSERT OR IGNORE INTO departments (id, name, code, faculty_id, description) VALUES 
('d-biblical', 'Department of Biblical Studies', 'DBS', 'f-theology', 'Biblical and theological studies'),
('d-ministry', 'Department of Ministry & Leadership', 'DML', 'f-theology', 'Practical ministry and leadership'),
('d-counseling', 'Department of Christian Counseling', 'DCC', 'f-education', 'Counseling and psychological studies'),
('d-education', 'Department of Christian Education', 'DCE', 'f-education', 'Education and teaching methodologies');

-- 3. Seed Programs
-- Undergraduate
INSERT OR IGNORE INTO programs (id, name, code, degree_type, level, department_id, duration_years, total_credit_hours, mode_of_study) VALUES 
('p-ba-biblical', 'BA in Biblical Studies', 'BBS', 'Bachelor of Arts', 'undergraduate', 'd-biblical', 4, 120, 'blended'),
('p-ba-education', 'BA in Christian Education', 'BCE', 'Bachelor of Arts', 'undergraduate', 'd-education', 4, 120, 'blended'),
('p-ba-ministry', 'BA in Ministry Leadership', 'BML', 'Bachelor of Arts', 'undergraduate', 'd-ministry', 4, 120, 'blended'),
('p-ba-theology', 'BA in Theological Studies', 'BTS', 'Bachelor of Arts', 'undergraduate', 'd-biblical', 4, 120, 'blended'),
('p-ba-worship', 'BA in Worship Leadership', 'BWL', 'Bachelor of Arts', 'undergraduate', 'd-ministry', 4, 120, 'blended');

-- Graduate
INSERT OR IGNORE INTO programs (id, name, code, degree_type, level, department_id, duration_years, total_credit_hours, mode_of_study) VALUES 
('p-mdiv', 'Master of Divinity (MDiv)', 'MDIV', 'Master of Divinity', 'graduate', 'd-ministry', 3, 90, 'blended'),
('p-ma-counseling', 'MA in Christian Counseling', 'MACC', 'Master of Arts', 'graduate', 'd-counseling', 2, 60, 'blended'),
('p-ma-theology', 'MA in Theology', 'MAT', 'Master of Arts', 'graduate', 'd-biblical', 2, 60, 'blended'),
('p-ma-education', 'MA in Christian Education', 'MACE', 'Master of Arts', 'graduate', 'd-education', 2, 60, 'blended'),
('p-ma-apologetics', 'MA in Christian Apologetics', 'MACA', 'Master of Arts', 'graduate', 'd-biblical', 2, 60, 'blended'),
('p-ma-leadership', 'MA in Christian Leadership', 'MACL', 'Master of Arts', 'graduate', 'd-ministry', 2, 60, 'blended');

-- Doctorate
INSERT OR IGNORE INTO programs (id, name, code, degree_type, level, department_id, duration_years, total_credit_hours, mode_of_study) VALUES 
('p-dmin', 'Doctor of Ministry (DMin)', 'DMIN', 'Doctor of Ministry', 'doctorate', 'd-ministry', 3, 45, 'blended'),
('p-thd', 'Doctor of Theology (ThD)', 'THD', 'Doctor of Theology', 'doctorate', 'd-biblical', 4, 60, 'blended'),
('p-dce', 'Doctor of Christian Education', 'DCE', 'Doctor of Education', 'doctorate', 'd-education', 3, 45, 'blended');

-- Certificates
INSERT OR IGNORE INTO programs (id, name, code, degree_type, level, department_id, duration_years, total_credit_hours, mode_of_study) VALUES 
('p-cert-biblical', 'Graduate Certificate in Biblical Studies', 'GCBS', 'Certificate', 'certificate', 'd-biblical', 1, 15, 'online'),
('p-cert-christian', 'Graduate Certificate in Christian Studies', 'GCCS', 'Certificate', 'certificate', 'd-biblical', 1, 15, 'online'),
('p-cert-formation', 'Graduate Certificate in Spiritual Formation', 'GCSF', 'Certificate', 'certificate', 'd-ministry', 1, 15, 'online');

-- Record Migration
INSERT OR IGNORE INTO _migrations (name) VALUES ('0032_seed_programs');
