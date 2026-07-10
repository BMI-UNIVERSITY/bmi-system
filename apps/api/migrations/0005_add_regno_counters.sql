-- Migration number: 0005   2026-07-01
-- Phase 4: Registration Number Generator

-- Per-program, per-year serial counter.
-- Uses INSERT ... ON CONFLICT ... DO UPDATE to atomically increment
-- without requiring Postgres-style row locks (which D1/SQLite does not support).
CREATE TABLE IF NOT EXISTS regno_counters (
  program_id    TEXT    NOT NULL,
  admission_year  INTEGER NOT NULL,
  last_serial     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (program_id, admission_year)
);
