-- Rollback: 0008_rollback.sql
-- Reverses the session_version column added in 0008_add_session_version.sql.
--
-- SQLite does not support DROP COLUMN in all versions, but Cloudflare D1
-- is based on SQLite 3.45+ which does support it.
--
-- To apply this rollback:
--   npx wrangler d1 execute bmi-portal-db --file=migrations/0008_rollback.sql
--
-- IMPORTANT: After running this rollback, you must also revert:
--   1. apps/api/lib/types.ts        — remove `sv` from JWTPayload
--   2. apps/api/middleware/auth.ts  — revert requireAuth to use sessions table
--   3. apps/api/routes/auth.ts      — remove sv from signJWT calls; revert logout/reset-password
--   4. apps/api/lib/WriteQueue.ts   — remove or disable (no longer needed without session_version)
--   5. apps/api/wrangler.jsonc      — remove durable_objects and migrations blocks
--   6. apps/api/index.ts            — remove WriteQueue export

ALTER TABLE users DROP COLUMN session_version;
