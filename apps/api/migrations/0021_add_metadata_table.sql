-- Migration: 0021_add_metadata_table
-- Adds the metadata key-value table and missing columns on courses
-- required by the registration wizard feature.

CREATE TABLE IF NOT EXISTS metadata (
  id    TEXT NOT NULL,
  key   TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (id, key)
);

ALTER TABLE courses ADD COLUMN name TEXT;
ALTER TABLE courses ADD COLUMN level TEXT;
ALTER TABLE courses ADD COLUMN programme_id TEXT REFERENCES programs(id);

UPDATE courses SET name = title WHERE name IS NULL;
