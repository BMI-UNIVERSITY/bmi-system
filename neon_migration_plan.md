# BMI UMS: Neon-Centric Architecture Migration Plan

This document outlines the step-by-step phases to safely migrate the BMI University Management System from its current monolithic Cloudflare D1 (SQLite) + Raw SQL architecture to a Multi-Database Neon (PostgreSQL) + Drizzle ORM architecture, without breaking existing functionality.

## Core Strategy: "Strangler Fig" Migration
We will not migrate everything at once. We will introduce Drizzle ORM first, map it to the existing schemas, and then swap the underlying database engine from D1 to Neon PostgreSQL. Finally, we will decouple the monolith into separate Neon databases.

---

## Phase 1: Preparation & Tooling (Drizzle ORM Setup)
The goal here is to introduce Drizzle into the codebase without altering existing runtime behavior.

- [x] **1.1. Install Dependencies:** 
  - Install `drizzle-orm`, `drizzle-kit` in `apps/api`.
  - Install PostgreSQL drivers: `@neondatabase/serverless`.
- [x] **1.2. Configure Drizzle Kit:**
  - Create `drizzle.config.ts` for schema generation and migration tracking.
  - Per-module configs: `drizzle-hr.config.ts`, `drizzle-library.config.ts`, `drizzle-alumni.config.ts`.
- [x] **1.3. Establish Database Connection Utilities:**
  - Create a new `lib/db.ts` to handle both local development (SQLite/Postgres) and production (Neon Serverless) connections.
  - `createCoreDb/HrlLibraryDb/AlumniDb` (Drizzle) + `createCoreIdb` (adapter) with D1 fallback + Hyperdrive support.

## Phase 2: Schema Translation (SQLite to TypeScript)
Before rewriting route handlers, we must define the database in TypeScript.

- [x] **2.1. Core Module Schema (`schema/core.ts`):**
  - Define `users`, `metadata`, `departments`, `programs`, `courses`.
- [x] **2.2. HR Module Schema (`schema/hr.ts`):**
  - Define `staff`, `leave_requests`, `payroll_records`.
- [x] **2.3. Student & Academic Schema (`schema/academic.ts`):**
  - Define `students`, `enrollments`, `grades`, `academic_standing`.
- [x] **2.4. Extended Modules Schemas (`schema/extended.ts`):**
  - Define Library, Alumni, Campus, and Notifications.
  - Note: boolean-ish columns use **integer 0/1** (not PG `boolean`) to stay wire-compatible with existing routes that compare `=== 1`.
- [x] **2.5. Generate Initial Postgres Migrations:**
  - Run `drizzle-kit generate:pg` to create the SQL migration files for Postgres based on the TS schemas.
  - Output: `apps/api/drizzle/{core,hr,library,alumni}/0000_*.sql`. Verified: `db:generate` produces no schema drift.

## Phase 3: Database Infrastructure (Neon Provisioning)
Setting up the physical databases in Neon.

- [ ] **3.1. Provision Neon Projects:**
  - Create `bmi-core-db` (Auth, Users, Programs).
  - Create `bmi-hr-db` (Staff, Payroll, Leave).
  - Create `bmi-library-db` (Books, Borrowings, Fines).
  - Create `bmi-alumni-campus-db` (Alumni, Transport, Notifications).
- [ ] **3.2. Apply Migrations to Neon:**
  - Use Drizzle Kit to push the generated schemas to the respective Neon databases.
- [x] **3.3. Environment Configuration:**
  - Update `wrangler.jsonc` and `.dev.vars` with the Neon `DATABASE_URL`s for each project (commented-out placeholders ready to enable).
  - Canonical domain updated to **bmiuniversities.org** across `packages/shared/src/domains.ts`, wrangler CORS overrides, and bootstrap R2 URL; legacy hkmministries.org origins retained during transition.

## Phase 3b: SQLite→Postgres Compatibility Adapter (engine swap without route rewrites)
Enables the strangler-fig swap: all existing `db.prepare()` routes run against Neon unchanged.

- [x] **3b.1. Build `PostgresDatabaseAdapter`** (`packages/adapters/src/cloudflare/PostgresDatabaseAdapter.ts`):
  - `translateSqliteToPostgres`: INSERT OR IGNORE/REPLACE, `datetime('now', mod)`, `date('now', mod)`, `strftime`, IFNULL→COALESCE, randomblob, json_valid, ON CONFLICT normalization.
  - `rewritePlaceholders`: `?` → `$1..$n` respecting string literals/comments.
  - `NeonPreparedStatement` + `PostgresDatabaseAdapter` implementing `IDatabase` + `IHealthCheck`.
- [x] **3b.2. Add `batch()` to the `IDatabase` port** and all adapters (D1 native atomic batch; Neon HTTP non-interactive `transaction`; memory mock).
- [x] **3b.3. Wire into bootstrap:** `buildCloudflare` picks `PostgresDatabaseAdapter` when `DATABASE_URL_CORE`/`DATABASE_URL`/Hyperdrive connection string is present, else falls back to D1.
- [x] **3b.4. Tests:** unit tests for SQL translation, placeholder rewriting, and batch SQL accessors (all passing).

## Phase 4: API Refactoring (Raw SQL ➡️ Drizzle)
This is the heaviest lifting. We will rewrite the route handlers one by one to use Drizzle instead of `db.prepare()`.
**Strategy note:** Phase 3b's adapter means routes do NOT need rewrites to keep working — they run against Neon via SQL translation. Phase 4 rewrites are incremental, done route-by-route to retire the adapter over time.

- [ ] **4.1. Update Auth & Core Routes:**
  - Refactor `routes/auth.ts`, `routes/admin.ts`.
- [ ] **4.2. Update Student & Academic Routes:**
  - Refactor `routes/student.ts`, `routes/ums-grades.ts`, `routes/enrollment.ts`.
- [ ] **4.3. Update HR Routes:**
  - Refactor `routes/ums-staff.ts` and `routes/ums-hr.ts`.
- [ ] **4.4. Update Extended Modules:**
  - Refactor Library, Alumni, Campus, and Notification routes.
- [ ] **4.5. Implement Application-Level Joins:**
  - Since databases are now split, replace cross-database SQL `JOIN`s (e.g., joining a Library Borrowing to a User) with application-level data fetching (fetch user from `core-db`, fetch borrowing from `library-db`, map in TypeScript).

## Phase 5: Data Migration Pipeline
Moving existing staging/production data from D1 to Neon.

- [ ] **5.1. Export D1 Data:**
  - Write a script to dump current D1 SQLite data to JSON or CSV.
- [ ] **5.2. Transform Data:**
  - Map SQLite data types (e.g., INTEGER booleans, TEXT dates) to PostgreSQL strict types (BOOLEAN, TIMESTAMP).
- [ ] **5.3. Import to Neon:**
  - Write a seeder script using Drizzle to bulk-insert the transformed data into the new Neon databases.

## Phase 6: Advanced Postgres Features (RLS & Hyperdrive)
Taking full advantage of Neon and Cloudflare.

- [ ] **6.1. Configure Connection Pooling (Cloudflare Hyperdrive):**
  - Bind Cloudflare Hyperdrive in `wrangler.jsonc` to maintain persistent connection pools to Neon, drastically reducing cold-start latency.
- [ ] **6.2. Implement Row-Level Security (RLS):**
  - Write Postgres RLS policies to restrict data access at the database level (e.g., students can only `SELECT` their own grades).
  - Update Drizzle connection factory to set the `set_config('request.jwt.claim.sub', userId)` context on each request.

## Phase 7: Testing, CI/CD, & Cutover

- [ ] **7.1. Run Full Test Suite:**
  - Ensure all Vitest tests pass with the new Drizzle/Neon mock setup.
- [ ] **7.2. Frontend E2E Verification:**
  - Walk through the UMS dashboard to ensure tables, mutations, and authentication work flawlessly with the new backend.
- [ ] **7.3. Deploy Backend to Staging:**
  - Deploy the updated Cloudflare Worker pointing to Neon staging databases.
- [ ] **7.4. Production Cutover:**
  - Freeze production D1.
  - Run final Data Migration (Phase 5).
  - Deploy Worker pointing to Neon production databases.
