-- Migration: 0034_fix_role_check_constraint.sql
-- Fixes the users.role CHECK constraint to include 'alumni' and 'verifier'.
-- SQLite does not support ALTER TABLE ALTER CONSTRAINT, so we recreate the table.

PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS users_new (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'applicant' CHECK(role IN ('applicant', 'student', 'staff', 'admin', 'alumni', 'verifier')),
  is_verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  mfa_secret  TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  session_version INTEGER NOT NULL DEFAULT 1,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  account_claimed INTEGER NOT NULL DEFAULT 0,
  student_email TEXT,
  person_id TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new SELECT * FROM users;

DROP TABLE IF EXISTS users_old;
ALTER TABLE users RENAME TO users_old;
ALTER TABLE users_new RENAME TO users;

DROP TABLE IF EXISTS users_old;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

PRAGMA foreign_keys=on;
