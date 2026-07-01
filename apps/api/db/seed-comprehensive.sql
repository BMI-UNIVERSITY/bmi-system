-- ============================================================================
-- BMI University - Comprehensive Seed Data
-- ============================================================================
-- This script populates the database with realistic sample data for testing
-- and demonstration purposes. Run this AFTER schema.sql has been applied.
--
-- Usage: npx wrangler d1 execute bmi-portal-db --remote --file=db/seed-comprehensive.sql
-- ============================================================================

-- Temporarily disable foreign key constraints during seeding
PRAGMA foreign_keys = OFF;

-- ============================================================================
-- 1. FACULTIES & ACADEMIC STRUCTURE
-- ============================================================================

INSERT OR REPLACE INTO faculties (id, name, code, description, is_active) VALUES
('fac-001', 'Faculty of Theology', 'THEO', 'Biblical Studies, Systematic Theology, Pastoral Ministry', 1),
('fac-002', 'Faculty of Education', 'EDU', 'Teacher Training, Educational Leadership, Curriculum Development', 1),
('fac-003', 'Faculty of Business', 'BUS', 'Business Administration, Economics, Entrepreneurship', 1),
('fac-004', 'Faculty of ICT', 'ICT', 'Computer Science, Information Systems, Cybersecurity', 1);

INSERT OR REPLACE INTO departments (id, name, code, faculty_id, description, is_active) VALUES
('dept-001', 'Biblical Studies', 'BIBL', 'fac-001', 'Old Testament, New Testament, Biblical Languages', 1),
('dept-002', 'Systematic Theology', 'SYST', 'fac-001', 'Dogmatics, Ethics, Church History', 1),
('dept-003', 'Educational Leadership', 'EDLD', 'fac-002', 'Administration, Policy, School Management', 1),
('dept-004', 'Curriculum Studies', 'CURR', 'fac-002', 'Instructional Design, Assessment, Pedagogy', 1),
('dept-005', 'Business Administration', 'BADM', 'fac-003', 'Management, Marketing, Finance', 1),
('dept-006', 'Computer Science', 'COMP', 'fac-004', 'Software Engineering, Algorithms, Data Structures', 1),
('dept-007', 'Information Systems', 'INSY', 'fac-004', 'Database Systems, Web Development, Cloud Architecture', 1);

INSERT OR REPLACE INTO programs (id, name, code, degree_type, level, department_id, duration_years, total_credit_hours, mode_of_study, is_active) VALUES
('prog-001', 'Bachelor of Arts in Systematic Theology', 'BA-THEO', 'Bachelor', 'Undergraduate', 'dept-002', 4, 120, 'Full-time', 1),
('prog-002', 'Bachelor of Education in Educational Leadership', 'BED-EDLD', 'Bachelor', 'Undergraduate', 'dept-003', 4, 120, 'Full-time', 1),
('prog-003', 'Diploma in ICT Architecture', 'DIP-ICT', 'Diploma', 'Certificate', 'dept-007', 2, 60, 'Full-time', 1),
('prog-004', 'Bachelor of Business Administration', 'BBA', 'Bachelor', 'Undergraduate', 'dept-005', 4, 120, 'Full-time', 1),
('prog-005', 'Master of Divinity', 'MDIV', 'Master', 'Graduate', 'dept-001', 3, 90, 'Full-time', 1);

INSERT OR REPLACE INTO academic_terms (id, name, code, academic_year, semester_number, start_date, end_date, status) VALUES
('term-2024-1', 'Fall 2024', 'F2024', '2024-2025', 1, '2024-09-01', '2024-12-15', 'closed'),
('term-2025-1', 'Spring 2025', 'S2025', '2024-2025', 2, '2025-01-15', '2025-05-15', 'closed'),
('term-2025-2', 'Fall 2025', 'F2025', '2025-2026', 1, '2025-09-01', '2025-12-15', 'active'),
('term-2026-1', 'Spring 2026', 'S2026', '2025-2026', 2, '2026-01-15', '2026-05-15', 'registration');

-- ============================================================================
-- 2. USERS (Students, Staff, Admin)
-- ============================================================================
-- Note: Password for all test users is "Admin@123" 
-- Hash: pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4

-- Admin User (already exists)
-- email: bmiuniversity8@gmail.com

-- Staff Members
INSERT OR REPLACE INTO users (id, email, password_hash, first_name, last_name, role, is_verified) VALUES
('staff-001', 'john.doe@bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'John', 'Doe', 'staff', 1),
('staff-002', 'mary.smith@bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Mary', 'Smith', 'staff', 1),
('staff-003', 'peter.johnson@bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Peter', 'Johnson', 'staff', 1);

INSERT OR REPLACE INTO staff (user_id, staff_no, department_id, designation) VALUES
('staff-001', 'STF-2020-001', 'dept-002', 'Lecturer'),
('staff-002', 'STF-2019-002', 'dept-003', 'Senior Lecturer'),
('staff-003', 'STF-2021-003', 'dept-006', 'Assistant Professor');

-- Current Students
INSERT OR REPLACE INTO users (id, email, password_hash, first_name, last_name, phone, role, is_verified) VALUES
('stud-001', 'james.kamau@student.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'James', 'Kamau', '+254712345001', 'student', 1),
('stud-002', 'grace.njeri@student.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Grace', 'Njeri', '+254712345002', 'student', 1),
('stud-003', 'david.otieno@student.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'David', 'Otieno', '+254712345003', 'student', 1),
('stud-004', 'faith.wanjiru@student.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Faith', 'Wanjiru', '+254712345004', 'student', 1),
('stud-005', 'samuel.mwangi@student.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Samuel', 'Mwangi', '+254712345005', 'student', 1),
('stud-006', 'ruth.akinyi@student.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Ruth', 'Akinyi', '+254712345006', 'student', 1),
('stud-007', 'daniel.mutua@student.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Daniel', 'Mutua', '+254712345007', 'student', 1),
('stud-008', 'esther.chebet@student.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Esther', 'Chebet', '+254712345008', 'student', 1);

INSERT OR REPLACE INTO students (user_id, reg_no, gender, date_of_birth, nationality, admission_date, programme, status, avatar_color, gpa, year_of_study, degree_level) VALUES
('stud-001', 'BMI/2023/001', 'Male', '2000-03-15', 'Kenyan', '2023-09-01', 'Bachelor of Arts in Systematic Theology', 'Active', '#9C27B0', 3.45, 2, 'Undergraduate'),
('stud-002', 'BMI/2023/002', 'Female', '2001-06-22', 'Kenyan', '2023-09-01', 'Bachelor of Education in Educational Leadership', 'Active', '#E91E63', 3.78, 2, 'Undergraduate'),
('stud-003', 'BMI/2024/003', 'Male', '2002-01-10', 'Kenyan', '2024-09-01', 'Diploma in ICT Architecture', 'Active', '#2196F3', 3.12, 1, 'Certificate'),
('stud-004', 'BMI/2022/004', 'Female', '1999-11-05', 'Ugandan', '2022-09-01', 'Bachelor of Business Administration', 'Active', '#4CAF50', 3.56, 3, 'Undergraduate'),
('stud-005', 'BMI/2023/005', 'Male', '2001-08-18', 'Tanzanian', '2023-09-01', 'Bachelor of Arts in Systematic Theology', 'Active', '#FF9800', 3.23, 2, 'Undergraduate'),
('stud-006', 'BMI/2024/006', 'Female', '2003-02-28', 'Kenyan', '2024-09-01', 'Bachelor of Education in Educational Leadership', 'Active', '#F44336', 3.67, 1, 'Undergraduate'),
('stud-007', 'BMI/2024/007', 'Male', '2002-12-12', 'Rwandan', '2024-09-01', 'Bachelor of Business Administration', 'Active', '#009688', 2.98, 1, 'Undergraduate'),
('stud-008', 'BMI/2023/008', 'Female', '2000-07-30', 'Kenyan', '2023-09-01', 'Diploma in ICT Architecture', 'Active', '#3F51B5', 3.89, 2, 'Certificate');

-- Alumni (Graduated Students)
INSERT OR REPLACE INTO users (id, email, password_hash, first_name, last_name, phone, role, is_verified) VALUES
('alum-001', 'jane.okumu@alumni.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Jane', 'Okumu', '+254700111001', 'student', 1),
('alum-002', 'kevin.omondi@alumni.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Kevin', 'Omondi', '+447700900001', 'student', 1),
('alum-003', 'peter.kamau@alumni.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Peter', 'Kamau', '+17135551001', 'student', 1),
('alum-004', 'sarah.wilson@alumni.bmi.ac.ke', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Sarah', 'Wilson', '+27215551001', 'student', 1);

INSERT OR REPLACE INTO students (user_id, reg_no, gender, date_of_birth, nationality, admission_date, programme, status, avatar_color, gpa, year_of_study, degree_level, graduation_date) VALUES
('alum-001', 'BMI/2014/101', 'Female', '1995-04-12', 'Kenyan', '2014-09-01', 'Bachelor of Education in Educational Leadership', 'Graduated', '#9C27B0', 3.92, 4, 'Undergraduate', '2018-07-15'),
('alum-002', 'BMI/2017/102', 'Male', '1997-09-25', 'Kenyan', '2017-09-01', 'Diploma in ICT Architecture', 'Graduated', '#2196F3', 3.45, 2, 'Certificate', '2019-07-15'),
('alum-003', 'BMI/2011/103', 'Male', '1992-02-08', 'Kenyan', '2011-09-01', 'Bachelor of Arts in Systematic Theology', 'Graduated', '#FF9800', 3.78, 4, 'Undergraduate', '2015-07-15'),
('alum-004', 'BMI/2017/104', 'Female', '1998-11-20', 'South African', '2017-09-01', 'Bachelor of Business Administration', 'Graduated', '#4CAF50', 3.56, 4, 'Undergraduate', '2021-07-15');

-- ============================================================================
-- 3. COURSES
-- ============================================================================

INSERT OR REPLACE INTO courses (id, code, title, description, credits, term, capacity, department_id, is_active) VALUES
-- Theology Courses
('course-001', 'THEO101', 'Introduction to Systematic Theology', 'Foundational concepts in Christian doctrine and belief systems', 3, 'Fall 2025', 50, 'dept-002', 1),
('course-002', 'BIBL201', 'Old Testament Survey', 'Comprehensive overview of Old Testament books and themes', 4, 'Fall 2025', 45, 'dept-001', 1),
('course-003', 'THEO301', 'Christology', 'Study of the person and work of Jesus Christ', 3, 'Fall 2025', 40, 'dept-002', 1),

-- Education Courses
('course-004', 'EDUC101', 'Foundations of Education', 'Philosophy, history, and sociology of education', 3, 'Fall 2025', 60, 'dept-003', 1),
('course-005', 'EDUC202', 'Educational Psychology', 'Learning theories and cognitive development', 3, 'Fall 2025', 55, 'dept-004', 1),
('course-006', 'EDUC301', 'Curriculum Development', 'Design and implementation of educational curricula', 4, 'Fall 2025', 50, 'dept-004', 1),

-- Business Courses
('course-007', 'BUS101', 'Principles of Management', 'Introduction to organizational management and leadership', 3, 'Fall 2025', 70, 'dept-005', 1),
('course-008', 'BUS201', 'Business Ethics', 'Ethical decision-making in business contexts', 3, 'Fall 2025', 65, 'dept-005', 1),
('course-009', 'BUS301', 'Strategic Management', 'Corporate strategy formulation and implementation', 4, 'Fall 2025', 50, 'dept-005', 1),

-- ICT Courses
('course-010', 'COMP101', 'Introduction to Programming', 'Fundamentals of computer programming using Python', 4, 'Fall 2025', 80, 'dept-006', 1),
('course-011', 'COMP201', 'Data Structures and Algorithms', 'Core algorithms and data structure implementations', 4, 'Fall 2025', 60, 'dept-006', 1),
('course-012', 'INSY201', 'Database Systems', 'Relational database design and SQL', 3, 'Fall 2025', 55, 'dept-007', 1),
('course-013', 'INSY301', 'Web Application Development', 'Full-stack web development with modern frameworks', 4, 'Fall 2025', 50, 'dept-007', 1);

-- ============================================================================
-- 4. ENROLLMENTS
-- ============================================================================

INSERT OR REPLACE INTO enrollments (id, student_id, course_id, term_id, status, grade, registration_date) VALUES
-- James Kamau (Theology Year 2)
('enroll-001', 'stud-001', 'course-001', 'term-2025-2', 'enrolled', NULL, '2025-08-15'),
('enroll-002', 'stud-001', 'course-002', 'term-2025-2', 'enrolled', NULL, '2025-08-15'),

-- Grace Njeri (Education Year 2)
('enroll-003', 'stud-002', 'course-004', 'term-2025-2', 'enrolled', NULL, '2025-08-15'),
('enroll-004', 'stud-002', 'course-005', 'term-2025-2', 'enrolled', NULL, '2025-08-15'),

-- David Otieno (ICT Year 1)
('enroll-005', 'stud-003', 'course-010', 'term-2025-2', 'enrolled', NULL, '2025-08-20'),
('enroll-006', 'stud-003', 'course-012', 'term-2025-2', 'enrolled', NULL, '2025-08-20'),

-- Faith Wanjiru (Business Year 3)
('enroll-007', 'stud-004', 'course-007', 'term-2025-2', 'enrolled', NULL, '2025-08-16'),
('enroll-008', 'stud-004', 'course-008', 'term-2025-2', 'enrolled', NULL, '2025-08-16'),
('enroll-009', 'stud-004', 'course-009', 'term-2025-2', 'enrolled', NULL, '2025-08-16');

-- ============================================================================
-- 5. CERTIFICATES (For Alumni)
-- ============================================================================

INSERT OR REPLACE INTO certificates (id, student_id, serial_number, degree_title, issue_date, gpa, status, content_hash) VALUES
('cert-001', 'alum-001', 'BMI-2018-CERT-001', 'Bachelor of Education in Educational Leadership', '2018-07-30', 3.92, 'ISSUED', 'a7f3c9e1b2d4f6a8c5e9d2b4f6a8c5e9'),
('cert-002', 'alum-002', 'BMI-2019-CERT-002', 'Diploma in ICT Architecture', '2019-07-30', 3.45, 'ISSUED', 'b8f4d0e2c3e5g7b9d6f0c3e5g7b9d6f0'),
('cert-003', 'alum-003', 'BMI-2015-CERT-003', 'Bachelor of Arts in Systematic Theology', '2015-07-30', 3.78, 'ISSUED', 'c9g5e1f3d4f6h8c0e7g1d4f6h8c0e7g1'),
('cert-004', 'alum-004', 'BMI-2021-CERT-004', 'Bachelor of Business Administration', '2021-07-30', 3.56, 'ISSUED', 'd0h6f2g4e5g7i9d1f8h2e5g7i9d1f8h2');

-- ============================================================================
-- 6. APPLICATIONS (For New Applicants)
-- ============================================================================

INSERT OR REPLACE INTO users (id, email, password_hash, first_name, last_name, phone, role, is_verified) VALUES
('appl-001', 'mark.odhiambo@gmail.com', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Mark', 'Odhiambo', '+254723456001', 'applicant', 1),
('appl-002', 'lucy.wangari@gmail.com', 'pbkdf2:03dd776b83a75e90485913380b4b51be:a66ced1f16e36701fb664288616c7c2a6782dd7457543c5979443fe3a87ac6e4', 'Lucy', 'Wangari', '+254723456002', 'applicant', 1);

INSERT OR REPLACE INTO applications (id, user_id, program, degree_level, status, personal_statement, submitted_at) VALUES
('app-001', 'appl-001', 'Bachelor of Business Administration', 'undergraduate', 'under_review', 'I am passionate about business and entrepreneurship...', '2025-11-15 10:30:00'),
('app-002', 'appl-002', 'Bachelor of Education in Educational Leadership', 'undergraduate', 'submitted', 'My goal is to become an educational leader...', '2025-12-01 14:20:00');

-- ============================================================================
-- 7. INVOICES (For Financial Management)
-- ============================================================================

INSERT OR REPLACE INTO invoices (id, student_id, amount, status, due_date) VALUES
('inv-001', 'stud-001', 45000, 'paid', '2025-09-30'),
('inv-002', 'stud-002', 45000, 'paid', '2025-09-30'),
('inv-003', 'stud-003', 30000, 'unpaid', '2025-09-30'),
('inv-004', 'stud-004', 45000, 'paid', '2025-09-30'),
('inv-005', 'stud-005', 45000, 'unpaid', '2025-09-30');

-- ============================================================================
-- 8. STUDENT SETTINGS
-- ============================================================================

INSERT OR REPLACE INTO student_settings (student_id, directory_release, communications_opt_in) VALUES
('stud-001', 1, 1),
('stud-002', 1, 1),
('stud-003', 1, 0),
('stud-004', 0, 1),
('stud-005', 1, 1),
('stud-006', 1, 1),
('stud-007', 1, 0),
('stud-008', 1, 1);

-- ============================================================================
-- 9. CMS CONTENT
-- ============================================================================

INSERT OR REPLACE INTO cms_pages (id, title, slug, content, status, author_id, published_at) VALUES
('page-001', 'About Us', 'about', '<h2>Welcome to BMI University</h2><p>We are a leading institution...</p>', 'published', '34001b3c-9828-4608-b801-ead96ba7b5c0', '2024-01-15'),
('page-002', 'Admissions', 'admissions', '<h2>Join Our Community</h2><p>Application process...</p>', 'published', '34001b3c-9828-4608-b801-ead96ba7b5c0', '2024-01-20');

INSERT OR REPLACE INTO cms_posts (id, title, slug, excerpt, content, status, author_id, published_at, tags) VALUES
('post-001', 'New Academic Year Begins', 'new-academic-year-2025', 'Welcome to Fall 2025 semester', '<p>The new academic year has officially begun...</p>', 'published', '34001b3c-9828-4608-b801-ead96ba7b5c0', '2025-09-01', '["news", "academic"]'),
('post-002', 'Alumni Success Stories', 'alumni-success-2025', 'Celebrating our graduates', '<p>Our alumni continue to make impacts...</p>', 'published', '34001b3c-9828-4608-b801-ead96ba7b5c0', '2025-10-15', '["alumni", "success"]');

-- ============================================================================
-- Done! Database seeded with sample data.
-- ============================================================================

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
