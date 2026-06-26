# Backend scripts

## Schema / collections

**Do not** use standalone TypeScript files here to create PocketBase collections.

- **Canonical**: `src/services/pocketbase.ts` — `setupCollections()` (runs on API startup).
- **Documentation**: `../../docs/SCHEMA_SETUP.md`

Legacy `setup-collections.ts` and `create-minimal-collections.ts` remain only as **stubs** that print an error and exit — they prevent accidental schema drift.
