/**
 * @deprecated This script is disabled.
 *
 * It created partial camelCase collections (e.g. exams) that do not match the
 * canonical enrollments + grades model.
 *
 * Canonical schema: src/services/pocketbase.ts → setupCollections()
 * Docs: docs/SCHEMA_SETUP.md
 */

console.error(`
[DEPRECATED] backend/scripts/create-minimal-collections.ts

Use the API server bootstrap (pocketbase.ts setupCollections) instead.
Docs: docs/SCHEMA_SETUP.md
`);
process.exit(1);
