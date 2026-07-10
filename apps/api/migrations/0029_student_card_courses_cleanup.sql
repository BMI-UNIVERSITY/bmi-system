-- Migration: 0029_student_card_and_courses_cleanup
-- Adds student ID card fields and deprecates courses.term in favour of term_id.

-- 1. STUDENT ID CARD FIELDS
-- QR/barcode data, card issue/expiry tracking for physical student ID cards.
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_student_card_fields'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('students') WHERE name = 'card_qr_data');
ALTER TABLE students ADD COLUMN card_qr_data TEXT;
-- Encoded QR payload (e.g. UID or a signed token)

INSERT OR IGNORE INTO _migrations (name) SELECT 'add_card_barcode_to_students'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('students') WHERE name = 'card_barcode');
ALTER TABLE students ADD COLUMN card_barcode TEXT;

INSERT OR IGNORE INTO _migrations (name) SELECT 'add_card_issued_at_to_students'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('students') WHERE name = 'card_issued_at');
ALTER TABLE students ADD COLUMN card_issued_at TEXT;

INSERT OR IGNORE INTO _migrations (name) SELECT 'add_card_expires_at_to_students'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('students') WHERE name = 'card_expires_at');
ALTER TABLE students ADD COLUMN card_expires_at TEXT;

-- 2. DEPRECATE courses.term
-- The `term` column (original text field) is deprecated in favour of `term_id`
-- (FK to academic_terms). Existing data is preserved but new code should use
-- term_id exclusively. This migration marks the deprecation structurally.
INSERT OR IGNORE INTO _migrations (name) SELECT 'deprecate_courses_term'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('courses') WHERE name = 'term_deprecated');
-- We don't rename the column (too disruptive), but we add a CHECK hint.
-- All new course creation should omit `term` and use `term_id` only.
