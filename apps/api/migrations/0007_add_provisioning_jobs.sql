-- Migration number: 0007   2026-07-01
-- Phase 6: Provisioning Jobs
--
-- Tracks downstream provisioning tasks (LMS, Library, Finance, Email, ID Card).
-- Designed to be processed asynchronously (e.g. via Cloudflare Queues or Cron).
-- Follows a retry pattern with exponential backoff and dead-letter alerting.

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  uid          TEXT NOT NULL REFERENCES persons(uid) ON DELETE CASCADE,
  job_type     TEXT NOT NULL CHECK(job_type IN ('finance', 'library', 'lms', 'portal', 'email', 'id_card')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_provisioning_uid ON provisioning_jobs(uid);
CREATE INDEX IF NOT EXISTS idx_provisioning_status ON provisioning_jobs(status);
