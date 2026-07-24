-- Migration: 0036_add_student_photo
-- Adds a photo column to the students table for storing cropped profile images.
-- Stored as base64-encoded JPEG string (data URI). Max practical size ~200KB after crop.

ALTER TABLE students ADD COLUMN photo TEXT;

INSERT OR IGNORE INTO _migrations (name) VALUES ('0036_add_student_photo');
