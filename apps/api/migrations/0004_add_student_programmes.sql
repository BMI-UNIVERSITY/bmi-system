-- Migration number: 0004 	 2026-07-01
-- Phase 3: Programme linkage + StudentProgramme history

-- student_programmes: Full history of every programme a student has been enrolled in.
-- One row per programme entry; current_flag = 1 marks the active programme.
-- registration_number is nullable here -- populated by Phase 4 RegNo generator.
CREATE TABLE IF NOT EXISTS student_programmes (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  -- Link to the persons UID (stable across role changes)
  uid                 TEXT NOT NULL REFERENCES persons(uid) ON DELETE CASCADE,
  registration_number TEXT,
  programme_id        TEXT NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  admission_year      INTEGER NOT NULL,
  enrollment_date     TEXT NOT NULL,
  completion_date     TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'transferred', 'withdrawn', 'graduated', 'suspended')),
  current_flag        INTEGER NOT NULL DEFAULT 1 CHECK(current_flag IN (0, 1)),
  graduated_flag      INTEGER NOT NULL DEFAULT 0 CHECK(graduated_flag IN (0, 1)),
  cgpa                REAL,
  classification      TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_student_progs_uid         ON student_programmes(uid);
CREATE INDEX IF NOT EXISTS idx_student_progs_programme   ON student_programmes(programme_id);
CREATE INDEX IF NOT EXISTS idx_student_progs_current     ON student_programmes(uid, current_flag);

-- Partial unique index: only one active programme per student at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_progs_one_current
  ON student_programmes(uid)
  WHERE current_flag = 1;

-- Link students back to their current programme via a proper FK (nullable until backfill)
ALTER TABLE students ADD COLUMN programme_id TEXT REFERENCES programs(id);
