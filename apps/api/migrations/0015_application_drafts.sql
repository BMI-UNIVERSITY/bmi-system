CREATE TABLE IF NOT EXISTS application_drafts (
    user_id TEXT PRIMARY KEY,
    application_data TEXT NOT NULL,
    current_step INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
