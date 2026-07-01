-- Migration number: 0006   2026-07-01
-- Phase 5: Lifecycle Workflow Engine
--
-- Each stage transition in the Application→Alumni pipeline is recorded as
-- a single immutable row. Rows are NEVER updated — this IS the audit trail.
-- The idempotency_key guarantees a partial failure can be resumed without
-- repeating already-completed sub-steps.

CREATE TABLE IF NOT EXISTS lifecycle_events (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  uid              TEXT REFERENCES persons(uid) ON DELETE SET NULL,
  application_id   TEXT REFERENCES applications(id) ON DELETE SET NULL,
  stage            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK(status IN ('pending','in_progress','completed','failed','skipped')),
  -- Unique key per logical operation — prevents duplicate execution on retry
  idempotency_key  TEXT UNIQUE NOT NULL,
  actor_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes            TEXT,
  error_detail     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_uid       ON lifecycle_events(uid);
CREATE INDEX IF NOT EXISTS idx_lifecycle_app_id    ON lifecycle_events(application_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_stage     ON lifecycle_events(stage, status);
CREATE INDEX IF NOT EXISTS idx_lifecycle_created   ON lifecycle_events(created_at);
