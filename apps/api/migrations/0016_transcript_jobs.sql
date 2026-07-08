-- Migration number: 0016
-- Create transcript_jobs table for asynchronous transcript generation via Cloudflare Queues.

CREATE TABLE IF NOT EXISTS transcript_jobs (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'processing', 'complete', 'failed')),
    format TEXT NOT NULL DEFAULT 'pdf' CHECK(format IN ('pdf', 'csv')),
    r2_key TEXT,
    error TEXT,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transcript_jobs_student_id ON transcript_jobs(student_id);
