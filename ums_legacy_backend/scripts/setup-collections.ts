/**
 * @deprecated This script is disabled.
 *
 * Canonical schema creation: `setupCollections()` in `src/services/pocketbase.ts`,
 * run automatically when the API starts (`src/index.ts`).
 *
 * See: `docs/SCHEMA_SETUP.md`
 */

console.error(`
[DEPRECATED] backend/scripts/setup-collections.ts

This script used camelCase student fields and could conflict with the canonical
snake_case + relations schema in src/services/pocketbase.ts.

Bootstrap: start PocketBase, configure backend/.env, then: cd backend && npm run dev
Docs: docs/SCHEMA_SETUP.md
`);
process.exit(1);
