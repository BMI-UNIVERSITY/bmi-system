-- Migration number: 0002 	 2026-07-01
-- Phase 1: Introduce the Person/UID layer (additive, non-breaking)

CREATE TABLE IF NOT EXISTS persons (
  id              TEXT PRIMARY KEY,
  uid             TEXT UNIQUE NOT NULL,
  national_id     TEXT,
  passport_no     TEXT,
  first_name      TEXT,
  middle_name     TEXT,
  last_name       TEXT,
  gender          TEXT,
  date_of_birth   TEXT,
  nationality     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_persons_uid ON persons(uid);

CREATE TABLE IF NOT EXISTS uid_counters (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  last_serial     INTEGER NOT NULL DEFAULT 0
);

-- Initialize the singleton counter row if it doesn't exist
INSERT OR IGNORE INTO uid_counters (id, last_serial) VALUES (1, 10000);



-- Add person_id to users (nullable at first)
ALTER TABLE users ADD COLUMN person_id TEXT REFERENCES persons(id);
