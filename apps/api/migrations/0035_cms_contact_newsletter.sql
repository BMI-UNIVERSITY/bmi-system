-- Migration: 0035_cms_contact_newsletter.sql
-- Adds tables to persist contact form submissions and newsletter subscribers
-- from the bmi-university marketing site.

CREATE TABLE IF NOT EXISTS contact_submissions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  status      TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'read', 'replied', 'archived')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_status    ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_created   ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_email     ON contact_submissions(email);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email        TEXT UNIQUE NOT NULL,
  source       TEXT NOT NULL DEFAULT 'website_footer',
  status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'unsubscribed')),
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email  ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);
