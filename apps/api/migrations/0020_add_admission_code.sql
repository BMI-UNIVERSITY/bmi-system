-- Migration: Add admission_code to users table for student account claiming
ALTER TABLE users ADD COLUMN admission_code TEXT;
ALTER TABLE users ADD COLUMN admission_code_expires_at TEXT;
ALTER TABLE users ADD COLUMN account_claimed INTEGER NOT NULL DEFAULT 0;

-- Index for fast lookup by admission code
CREATE INDEX IF NOT EXISTS idx_users_admission_code ON users(admission_code);
