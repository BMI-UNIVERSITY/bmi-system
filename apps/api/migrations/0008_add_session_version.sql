-- Migration: 0008_add_session_version.sql
-- Adds session_version to users table for immediate token invalidation on logout.
-- When a user logs out or resets their password, session_version is incremented.
-- The JWT payload includes sv (session version); requireAuth validates it against
-- the DB value, making logout/password-reset invalidation instant and consistent
-- (eliminates the D1 sessions table lookup on every request).

ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1;
