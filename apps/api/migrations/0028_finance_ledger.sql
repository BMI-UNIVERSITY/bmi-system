-- Migration: 0028_finance_ledger
-- Adds UID-linked ledger accounts and transaction entries.
-- The ledger replaces the basic invoices table as the source of truth,
-- while invoices remain for backward compatibility.

-- 1. LEDGER ACCOUNTS
-- One account per student, linked via UID (survives program transfer).
-- Balance is derived from SUM of ledger entries.
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  uid        TEXT NOT NULL REFERENCES persons(uid) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'frozen', 'closed')),
  label      TEXT,
  metadata   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(uid)
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_uid ON ledger_accounts(uid);

-- 2. LEDGER ENTRIES
-- Every financial event: charge, payment, scholarship, adjustment, refund.
-- Balance is computed as SUM(amount) — positive = debt, negative = credit.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id  TEXT NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
  entry_type  TEXT NOT NULL CHECK(entry_type IN ('charge', 'payment', 'scholarship', 'adjustment', 'refund', 'waiver')),
  amount      REAL NOT NULL,
  -- Positive = charge/debt, Negative = payment/credit
  currency    TEXT NOT NULL DEFAULT 'XAF',
  description TEXT,
  reference_type TEXT,
  reference_id   TEXT,
  -- e.g. invoice ID, scholarship ID
  term_id     TEXT REFERENCES academic_terms(id),
  created_by  TEXT REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_term    ON ledger_entries(term_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type    ON ledger_entries(entry_type);

-- 3. Link invoices to UID for cross-reference
INSERT OR IGNORE INTO _migrations (name) SELECT 'add_uid_to_invoices'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('invoices') WHERE name = 'uid');
ALTER TABLE invoices ADD COLUMN uid TEXT REFERENCES persons(uid);

CREATE INDEX IF NOT EXISTS idx_invoices_uid ON invoices(uid);

-- Backfill invoices.uid from students.uid
UPDATE invoices
SET uid = (SELECT s.uid FROM students s WHERE s.user_id = invoices.student_id)
WHERE uid IS NULL;
