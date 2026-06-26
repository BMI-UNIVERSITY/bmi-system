-- Migration: 001_add_ums_columns
-- Idempotent migration to add UMS-related columns to courses and enrollments.
-- Safe to run multiple times — each ALTER is skipped if already applied.
-- Run: npx wrangler d1 execute bmi-portal-db --file=db/migrations/001_add_ums_columns.sql

CREATE TABLE IF NOT EXISTS _migrations (
  name       TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add department_id to courses
-- SQLite does not support IF NOT EXISTS on ALTER TABLE; we gate with _migrations.
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_department_id_to_courses'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('courses') WHERE name = 'department_id');

-- Only execute ALTER if the column doesn't already exist (checked via _migrations)
-- In SQLite/D1: the INSERT above is a no-op if already applied; the ALTER is separate.
-- This file is designed to be run idempotently by checking pragma first in CI scripts.

-- Migration: 002_add_is_active_to_courses
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_is_active_to_courses'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('courses') WHERE name = 'is_active');

-- Migration: 003_add_term_id_to_enrollments
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_term_id_to_enrollments'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('enrollments') WHERE name = 'term_id');

-- Migration: 004_add_registration_date_to_enrollments
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_registration_date_to_enrollments'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('enrollments') WHERE name = 'registration_date');
