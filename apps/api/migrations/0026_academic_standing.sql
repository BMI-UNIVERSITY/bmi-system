-- Migration: 0026_academic_standing
-- Adds configurable academic standing rules and per-term standing tracking.

-- 1. STANDING RULES
-- Configurable rules that define thresholds for each standing level.
CREATE TABLE IF NOT EXISTS standing_rules (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rule_name         TEXT NOT NULL UNIQUE,
  standing          TEXT NOT NULL CHECK(standing IN ('good', 'warning', 'probation', 'suspended', 'dismissed')),
  min_gpa           REAL,
  max_gpa           REAL,
  max_consecutive_terms INTEGER,
  min_completion_rate REAL,
  -- e.g. 0.67 = must pass at least 67% of credits
  is_active         INTEGER NOT NULL DEFAULT 1,
  description       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO standing_rules (rule_name, standing, min_gpa, max_gpa, max_consecutive_terms, min_completion_rate, description) VALUES
  ('Good Standing',              'good',      2.0,  NULL, NULL, 0.67, 'GPA >= 2.0 and pass rate >= 67%'),
  ('Academic Warning',           'warning',   1.75, 1.99, NULL, 0.50, 'GPA between 1.75 and 1.99'),
  ('Probation',                  'probation', 1.5,  1.74, 1,    0.50, 'GPA between 1.5 and 1.74 for one term'),
  ('Probation Extension',        'probation', 1.5,  1.74, 2,    0.50, 'GPA between 1.5 and 1.74 for two consecutive terms'),
  ('Suspension',                 'suspended', NULL, 1.49, 2,    NULL, 'GPA below 1.5 for two consecutive terms'),
  ('Dismissal',                  'dismissed', NULL, 1.0,  3,    NULL, 'GPA below 1.0 for three consecutive terms');

-- 2. ACADEMIC STANDING RECORDS
-- Per-term snapshot of a student's academic standing.
CREATE TABLE IF NOT EXISTS academic_standing_records (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  student_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  term_id         TEXT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  standing        TEXT NOT NULL CHECK(standing IN ('good', 'warning', 'probation', 'suspended', 'dismissed')),
  term_gpa        REAL,
  cumulative_gpa  REAL,
  credits_attempted REAL,
  credits_earned  REAL,
  completion_rate REAL,
  rule_id         TEXT REFERENCES standing_rules(id),
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_standing_records_student ON academic_standing_records(student_id);
CREATE INDEX IF NOT EXISTS idx_standing_records_term    ON academic_standing_records(term_id);
CREATE INDEX IF NOT EXISTS idx_standing_records_standing ON academic_standing_records(standing);
