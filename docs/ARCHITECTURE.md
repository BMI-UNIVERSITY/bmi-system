# BMI System Architecture

The BMI System is an edge-native Student Information System (SIS) deployed on Cloudflare Workers and Cloudflare D1.

> **Note (2026-07-09):** A domain-worker split ("Phase 2") was designed and partially implemented. It was subsequently consolidated back into the monolith. The monolith (`apps/api`, deployed as `bmi-api`) currently serves **all production traffic**. The planned split is documented below for future reference, but is **not currently deployed**.

## Current Deployed Topology

- **`bmi-portal` (Pages)**: The student/applicant frontend. Calls `bmi-api` via `VITE_API_URL`.
- **`bmi-ums` (Pages)**: The staff/admin frontend. Calls `bmi-api` via `VITE_API_URL`.
- **`bmi-university` (Pages)**: The marketing site.
- **`bmi-api` (Worker)**: The monolith API. Handles **all** `/api/*` routes — auth, applications, UMS, documents, grades, webhooks, CMS, and public endpoints. Deployed at `bmi-api.bmiuniversity107.workers.dev`.

## Database & Storage

- **D1 (`bmi-portal-db`)**: Single relational database for all application data.
- **R2 (`bmi-portal-documents`, `bmi-portal-backups`)**: Object storage for documents and nightly backups.
- **Email Queue**: Cloudflare Queue for reliable, async email delivery via Resend.

## The WriteQueue Durable Object (Reference — not active in monolith)

SQLite (D1) supports multiple concurrent reads but strictly sequential writes. Under heavy load, concurrent write requests will trigger `SQLITE_BUSY` errors.

The WriteQueue Durable Object was designed to solve this:
1. Worker receives a `POST`/`PUT`/`DELETE`.
2. Worker binds to the WriteQueue DO.
3. WriteQueue serializes the requests and executes the D1 mutation atomically.
4. Response is returned to the worker.

The `@bmi/adapters` package includes a `MemoryWriteQueueAdapter` used during testing. The production `bmi-api` writes directly to D1 (the DO is not active in the current monolith).

## Caching

Read saturation is prevented by the Cloudflare Cache API (`caches.default`).
Read-heavy endpoints return cached responses with configurable TTLs (set per-route in `apps/api/index.ts`).
Mutations explicitly invalidate these cache keys (`caches.default.delete()`).
