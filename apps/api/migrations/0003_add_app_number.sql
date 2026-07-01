-- Migration number: 0003 	 2026-07-01
-- Phase 2: Application Number + Applicant separation

CREATE TABLE IF NOT EXISTS application_number_counters (
  year            INTEGER PRIMARY KEY,
  last_serial     INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE applications ADD COLUMN application_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_number ON applications(application_number)
  WHERE application_number IS NOT NULL;
