-- Migration: 0018_add_applicant_profile_fields.sql
-- Adds missing personal information and academic history fields 
-- to match the Applicant Profile UI in the UMS.

-- Add personal info fields to users table
ALTER TABLE users ADD COLUMN date_of_birth TEXT;
ALTER TABLE users ADD COLUMN nationality TEXT;
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN gender TEXT;

-- Add academic history fields to applications table
ALTER TABLE applications ADD COLUMN high_school TEXT;
ALTER TABLE applications ADD COLUMN graduation_year INTEGER;
ALTER TABLE applications ADD COLUMN gpa REAL;
