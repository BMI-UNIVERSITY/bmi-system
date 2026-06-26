# PocketBase schema setup (canonical)

## Single source of truth

All PocketBase collections are defined and created by the **API server** on startup:

- **Implementation**: [`backend/src/services/pocketbase.ts`](../backend/src/services/pocketbase.ts) — `setupCollections()`
- **Invocation**: [`backend/src/index.ts`](../backend/src/index.ts) — called after PocketBase is reachable

The schema uses **snake_case** field names and **relations** (e.g. `program` → `programs`, grades linked via `enrollments`).

## How to bootstrap a fresh database

1. Start PocketBase (e.g. `./pocketbase serve` or your compose stack).
2. Configure `backend/.env` with `POCKETBASE_*` admin credentials (see `backend/.env.example`).
3. Start the API: `cd backend && npm run dev` (or your process manager).

On first connection, missing collections are created from `setupCollections()`.

## Deprecated scripts (do not use)

These paths previously created **incompatible** camelCase / partial schemas:

| Path | Status |
|------|--------|
| `backend/scripts/setup-collections.ts` | **Deprecated** — exits with instructions |
| `backend/scripts/create-minimal-collections.ts` | **Deprecated** — exits with instructions |
| `scripts/migrate-db.ts` | **Deprecated** — blocked unless `ALLOW_LEGACY_POCKETBASE_MIGRATE=1` |

If you must run the legacy root migration for an emergency recovery on an old instance, set the env var and accept the risk of schema drift; then prefer a fresh PB data dir and canonical bootstrap.

## Related

- [`docs/SCHEMA_CONTRACT_AUDIT.md`](./SCHEMA_CONTRACT_AUDIT.md) — frontend vs backend field mapping (maintained during rollout).
