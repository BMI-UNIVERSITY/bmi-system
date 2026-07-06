# BMI System Architecture

The BMI System is an edge-native Student Information System (SIS) deployed on Cloudflare Workers and Cloudflare D1.

## Domain Worker Topography

The monolith API was decoupled into domain-specific workers using Cloudflare DNS routing (no proxy overhead).

- **`bmi-portal` (Pages)**: The student/applicant frontend.
- **`bmi-ums` (Pages)**: The staff/admin frontend.
- **`bmi-university` (Pages)**: The marketing site.
- **`bmi-auth` (Worker)**: Handles `/api/auth/*` and `oauth_accounts`.
- **`bmi-ums` (Worker)**: Handles `/api/students/*`, `/api/courses/*`, `/api/enrollments/*`.
- **`bmi-core` (Worker)**: Handles core SIS domains (`/api/programmes`, `/api/documents`).
- **`bmi-webhooks` (Worker)**: Secure ingress for internal webhooks (via HMAC) and external providers.
- **`bmi-public` (Worker)**: Unauthenticated public endpoints (e.g. CMS fetching for the marketing site).

## DNS Routes

Cloudflare automatically routes traffic to the correct worker based on the path. There is no central API gateway.
- `api.hkmministries.org/auth/*` -> `bmi-auth`
- `api.hkmministries.org/v1/students/*` -> `bmi-ums`
- `api.hkmministries.org/v1/courses/*` -> `bmi-ums`

## The WriteQueue Durable Object

SQLite (D1) supports multiple concurrent reads but strictly sequential writes. Under heavy load, concurrent write requests will trigger `SQLITE_BUSY` errors.

To solve this, mutations are forwarded to the **WriteQueue Durable Object**.
1. Worker receives a `POST`/`PUT`/`DELETE`.
2. Worker binds to the WriteQueue DO.
3. WriteQueue serializes the requests and executes the D1 mutation atomically.
4. Response is returned to the worker.

## Caching

Read saturation is prevented by the Cloudflare Cache API (`caches.default`). 
Read-heavy endpoints (`GET /api/v1/students`) return cached responses with a 30s TTL.
Mutations explicitly invalidate these cache keys (`caches.default.delete()`).
