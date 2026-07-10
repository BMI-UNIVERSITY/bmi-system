
-- Add document archiving and expiry fields
ALTER TABLE documents ADD COLUMN archived_at TEXT;
ALTER TABLE documents ADD COLUMN expires_at TEXT;
ALTER TABLE documents ADD COLUMN is_sensitive INTEGER NOT NULL DEFAULT 0;
ALTER TABLE documents ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

-- Add index on documents for archived status and expiry dates
CREATE INDEX IF NOT EXISTS idx_docs_archived ON documents(archived_at);
CREATE INDEX IF NOT EXISTS idx_docs_expires ON documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_docs_sensitive ON documents(is_sensitive);
