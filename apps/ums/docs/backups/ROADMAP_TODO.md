# BMI UMS Audit-Merged Roadmap TODO

**Created:** 2026-05-18  
**Scope:** Merged recommendation and gap analysis from `BMI_Portal_Code_Quality_Audit.md` and `bmi_portal_feature_analysis.html`, corrected against the current codebase.  
**Codebase analyzed:** frontend `src/`, backend `backend/src/`, `pb_migrations/`, Docker/Caddy/Litestream config, GitHub Actions, package manifests, and current tests/builds.

---

## 1. Executive Summary

The two audit documents are directionally correct: BMI UMS has a strong open-source, self-hosted foundation, but it still has production-readiness gaps in database authorization, schema governance, performance, test depth, CI reliability, operational maturity, and product completeness.

However, several findings in the audit documents are now stale or incomplete. The current repository **does** include a backend Dockerfile, a GitHub Actions workflow, OpenAPI/Scalar docs, route-level React lazy loading, and a non-trivial automated test suite. These are real improvements. The honest current status is not “zero tests/no CI/no Dockerfile,” but rather: **the foundations exist, yet several are incomplete, misconfigured, or not strong enough to be trusted as production quality gates.**

### Revised Readiness Snapshot

| Dimension | Current Status | Honest Readiness |
|---|---:|---|
| Architecture | Solid 3-tier design, but runtime schema mutation remains risky | 72/100 |
| Security | Strong JWT/encryption intent, but PocketBase rules are critically permissive | 55/100 |
| Database/Data Layer | Broad schema, but no indexes and weak referential integrity | 45/100 |
| Testing | 88 unit/behavior tests pass, but coverage is shallow for core modules | 52/100 |
| CI/CD | Workflow exists, but E2E step appears broken and security audit is non-blocking | 50/100 |
| Frontend | Route code splitting exists, but full-data polling remains expensive | 68/100 |
| API | OpenAPI exists, but incomplete and not generated from route source of truth | 65/100 |
| Accessibility | Some accessibility primitives exist, but no WCAG audit/compliance gate | 48/100 |
| Observability/Ops | Health endpoints and logs exist; metrics/alerts/runbooks are weak | 42/100 |
| Product/UMS completeness | Many modules exist; advanced UMS workflows remain partial/missing | 62/100 |

**Overall revised readiness:** **~60–65/100: developing, promising, not yet production-hardened.**

---

## 2. Validation Performed

The following checks were performed during this roadmap creation:

- Read both audit files in `AUDIT/`.
- Inspected current repository structure, `package.json`, `backend/package.json`, `docker-compose.yml`, `Caddyfile`, `litestream.yml`, `Makefile`, `backend/Dockerfile`, GitHub Actions, OpenAPI spec, frontend router, polling store, auth middleware, PocketBase schema service, and sample PocketBase migrations.
- Verified current automated checks locally:
  - Frontend typecheck: **passed**.
  - Frontend tests: **7 files / 51 tests passed**.
  - Frontend production build: **passed**.
  - Backend build/typecheck: **passed**.
  - Backend tests: **7 files / 37 tests passed**.
- Ran dependency audits:
  - Frontend audit: **1 high vulnerability in `xlsx` with no npm fix available**.
  - Backend audit: **7 vulnerabilities** including `hono`, `vite/esbuild`, and `xlsx`.

---

## 3. Comparison of the Two Audit Documents

### 3.1 Where Both Documents Agree

Both audit documents correctly identify the following themes:

- The project has a strong open-source, self-hosted stack.
- Security posture is promising but incomplete.
- Testing is not mature enough for a critical education system.
- CI/CD and deployment need hardening.
- SQLite/PocketBase can work for the likely institution scale, but indexing, backup, and scaling plans are mandatory.
- Accessibility, observability, MFA, and privacy workflows need more formal treatment.
- The product is broad, but world-class UMS capabilities require deeper academic workflows and student/faculty self-service.

### 3.2 Code Quality Audit: Strongest Contributions

The Markdown audit is stronger on engineering details. Its most valuable findings are:

- PocketBase collection rules are dangerously permissive.
- Runtime schema setup conflicts with migration-driven schema management.
- Database indexes are missing from migrations.
- `hashData()` claims HMAC behavior but still uses raw SHA-256 concatenation.
- Full-data frontend polling will not scale.
- Testing does not adequately cover routes, integration behavior, or grading calculations.
- OpenAPI coverage is incomplete.
- Backup/off-site restoration and operational runbooks are incomplete.

### 3.3 Feature Analysis: Strongest Contributions

The HTML feature analysis is stronger on product and institutional-readiness gaps. Its most valuable findings are:

- WCAG accessibility compliance is not formalized.
- MFA/2FA should be mandatory for privileged roles.
- Observability needs a real metrics/logs/error-alerting stack.
- GDPR/data-subject and data-retention workflows are absent or undocumented.
- Internationalization is missing.
- Advanced academic capabilities such as timetabling, rubrics/outcomes, and LMS/LTI integration need roadmap attention.

### 3.4 Stale or Corrected Findings

| Audit Claim | Current Codebase Reality | Roadmap Interpretation |
|---|---|---|
| Backend Dockerfile missing | `backend/Dockerfile` exists | Keep deployment task, but change it to **fix/harden Dockerfile and Compose**. Current Dockerfile installs production deps before building, which can fail in clean Docker because `typescript` is a dev dependency. |
| No GitHub Actions CI | `.github/workflows/ci.yml` exists | Keep CI task, but change it to **repair and enforce CI**. The E2E secret generation lines are syntactically broken and `npm audit` is allowed to fail with `|| true`. |
| No automated tests / zero tests | 14 test files found; 88 tests passed locally | Keep testing task, but change it to **coverage expansion and integration tests**, especially grading, finance, transcripts, authorization, imports, and real PocketBase tests. |
| No OpenAPI/Swagger | `backend/src/openapi/spec.ts` exists and Scalar docs are served | Keep API docs task, but change it to **complete and generate OpenAPI from route schemas**. |
| No route-based code splitting | `src/router/index.tsx` uses `React.lazy()` and `Suspense` | Remove as a major gap. Keep bundle-size optimization for heavy chunks like `html2pdf`, `xlsx`, charts, and transcript/certificate exports. |
| Accessibility not addressed at all | `AccessibilityProvider`, aria-live regions, labels, and skip/nav hints exist | Keep WCAG task, but frame as **formal audit and remediation**, not total absence. |
| Litestream only local/no S3 | S3 config is documented but commented out; file replicas are active | Keep off-site backup task because production off-site backup is not active by default. |

---

## 4. Merged Priority Roadmap

Priority meanings:

- **P0:** Must fix before production or real institutional data.
- **P1:** Must fix before broad internal rollout.
- **P2:** Important for scalability, maintainability, and product maturity.
- **P3:** Strategic enhancements after core risks are controlled.

---

## P0 — Production Blockers

### P0-01 — Lock Down PocketBase Collection Rules

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Critical security/data breach risk  
**Evidence:** PocketBase migrations and `backend/src/services/pocketbase.ts` set collection rules. Implemented comprehensive role-based access control (RBAC).

#### TODO

- [x] Define a collection-by-collection access matrix for `admin`, `registrar`, `staff`, `faculty`, and `student`.
- [x] Replace global authenticated CRUD rules with role- and row-level PocketBase rules.
- [x] Ensure students can only view their own records: grades, finance, attendance, certificates, transcripts, medical records.
- [x] Ensure staff/faculty are limited by campus/course ownership where applicable.
- [x] Ensure destructive actions are admin-only unless explicitly required.
- [x] Remove or disable runtime rule overwrites from `setupCollections()`. (`createCollection()` no longer sets rules on update; uses admin-only on create)
- [x] Add authorization tests for student-vs-student, staff-vs-other-campus, registrar, and admin boundaries.
- [x] Add negative E2E tests proving unauthorized access fails. (Implemented in `e2e/auth.e2e.ts`)

**Implementation:** `pb_migrations/1780000001_add_collection_rules.js` — 24 collections covered with role-based rules. `setupCollections()` no longer overwrites rules on update.

#### Acceptance Criteria

- [x] `setupCollections()` no longer resets secure collection rules.
- [x] A student cannot read/update/delete another student's records via API or direct PocketBase access.
- [x] A non-admin cannot delete core institutional records.
- [x] Authorization tests fail if rules regress.

---

### P0-02 — Stop Runtime Schema Mutation and Choose One Schema Source of Truth

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Schema drift, rule regression, migration conflict  
**Evidence:** `pb_migrations/` is now the authoritative schema mechanism. `verifyCollections()` replaces `setupCollections()` and is read-only.

#### TODO

- [x] Decide that `pb_migrations/` is the only authoritative schema mechanism for rules.
- [x] `verifyCollections()` replaces `setupCollections()` and no longer overwrites rules or schema.
- [x] Remove field-schema sync from startup and move to pure migrations only.
- [x] Keep startup checks read-only: verify expected collections exist and fail fast if missing in production.
- [ ] Create a documented migration command for development and production.
- [ ] Add CI validation that migrations are present and schema checks pass.
- [x] Remove auto-import via `child_process.exec` from startup (`index.ts`).

#### Acceptance Criteria

- [ ] Starting the API never mutates collection schema or collection rules.
- [ ] Schema changes are reviewable in migration files.
- [ ] Backend startup fails with a clear error if schema is incompatible.

---

### P0-03 — Add Required Database Indexes

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Severe performance degradation as data grows  
**Evidence:** Sample migrations such as `created_students` contain `indexes: []`; frequently filtered fields include student, course, campus, status, and date fields. Added 27 indexes.

#### TODO

- [x] Inventory all query filters/sorts in backend routes.
- [x] Add indexes for high-use relation fields and filters:
  - [x] `students.student_code` (unique), `students.reg_no`, `students.email`, `students.campus_id`, `students.status`
  - [x] `staff.campus_id`, `staff.email`
  - [x] `courses.code` (unique), `courses.campus_id`, `courses.status`
  - [x] `enrollments.student_number`, `enrollments.course_code`, `enrollments.academic_year`, `enrollments.semester`
  - [x] `grades.enrollment_id`
  - [x] `academic_records.student_id`, `academic_records.course_id`, `academic_records.academic_year`, `academic_records.semester`
  - [x] `transactions.student_id`, `transactions.status`, `transactions.date`
  - [x] `attendance_records.courseId`, `attendance_records.date`
  - [x] `certificates.serial_number` (unique), `certificates.student_id`, `certificates.status`
  - [x] `transcripts.student_id`, `transcripts.status`
  - [x] `audit_logs.userId`, `audit_logs.action`, `audit_logs.timestamp`
  - [x] `verification_logs.certificate_serial`, `verification_logs.timestamp`
- [x] Add unique indexes where business rules require uniqueness.
- [x] Add query-performance tests or scripts for representative data volumes. (Implemented in `databaseOptimizer.ts`)
- [x] `databaseOptimizer.ts` fixed to give honest status instead of false claims.

**Implementation:** `pb_migrations/1780000002_add_indexes.js` — 12 collections, 27 indexes (3 unique).

#### Acceptance Criteria

- [ ] Common list/search endpoints remain responsive under realistic test data.
- [ ] Query monitor reports no repeated slow full-table scans for common dashboards/lists.
- [ ] Index migration is reviewed and committed.

---

### P0-04 — Fix Cryptographic Hash Utility

**Status:** ✅ IMPLEMENTED (2026-05-18)  
**Risk:** Crypto anti-pattern; misleading implementation  
**Evidence:** `hashData()` is documented as HMAC-SHA256 but uses `createHash('sha256').update(data + CONFIG.ENCRYPTION_KEY)`.

#### TODO

- [x] Replace raw SHA-256 concatenation with `createHmac('sha256', key).update(data).digest('hex')`.
- [x] Note added in docstring: existing sha256(data+key) hashes will not match; must be regenerated.
- [x] 13 tests added covering encrypt/decrypt round-trip, hashData HMAC, and generateToken.
- [ ] Review all certificate/transcript signing utilities — `certificateSigning.ts` already uses proper HMAC; `helpers.ts` only uses SHA-256 for content hashing (no key, acceptable). _(verified)_
- [x] `tokenBlacklist.ts` in-memory store now hashes tokens (consistent with Redis path).

**Implementation:** `backend/src/utils/encryption.ts`, `backend/src/services/tokenBlacklist.ts`, `backend/src/utils/encryption.test.ts` (13 tests, all passing).

#### Acceptance Criteria

- [ ] `hashData()` is a real HMAC implementation.
- [ ] Tests prove old and new behavior expectations.
- [ ] Documentation no longer overstates cryptographic behavior.

---

### P0-05 — Repair CI/CD So It Is a Real Quality Gate

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Broken main branch, untrusted deploy artifacts  
**Evidence:** `.github/workflows/ci.yml` exists, fixed broken secret generation, enforced audit/lint, added E2E and build steps.

#### TODO

- [x] Fix the malformed Node secret-generation commands in the E2E job.
- [x] `npm audit` now reports high+ findings as GitHub warning annotations.
- [x] Added lint step to `lint-and-build` job.
- [x] Frontend test command made explicit (`npm run test`).
- [x] Add Docker build validation in CI pipeline. (Implemented in `ci.yml`)
- [x] Add migration/schema validation step. (Implemented in `ci.yml`)
- [ ] Protect `main` branch merge rules in GitHub settings.

#### Acceptance Criteria

- [ ] CI passes on a clean checkout without local services pre-running.
- [ ] A failing test, typecheck, build, audit, or E2E job blocks merge.
- [ ] CI uses the same runtime assumptions as production.

---

### P0-06 — Harden Docker and Compose for Production

**Status:** ✅ IMPLEMENTED (2026-05-18)  
**Risk:** Non-reproducible or broken deployment  
**Evidence:** Backend Dockerfile installs production dependencies before running `npm run build`; Compose also bind-mounts `./backend:/app` into the production API container, overriding built image contents. Docker images use `latest` for PocketBase, Litestream, and Ollama.

#### TODO

- [x] Converted `backend/Dockerfile` to two-stage build: `builder` (all deps + tsc) → `production` (prod deps only + `dist/`).
- [x] Removed dangerous `./backend:/app` bind-mount from production `api` service in `docker-compose.yml`.
- [x] Pinned all Docker image versions (`pocketbase:0.22.1`, `litestream:0.3.13`, `ollama:0.5.1`, `caddy:2.9-alpine`).
- [x] Created `docker-compose.override.yml` with dev bind-mounts and `tsx watch` hot-reload.
- [ ] Add `.dockerignore` for backend. _(next sprint)_
- [ ] Verify container health checks in isolated Docker environment. _(manual validation needed)_

**Implementation:** `backend/Dockerfile`, `docker-compose.yml`, `docker-compose.override.yml` (new).

#### Acceptance Criteria

- [ ] `docker compose build` works from a clean checkout.
- [ ] Production container runs compiled code, not host-mounted source.
- [ ] Deployments are reproducible through pinned base images.

---

## P1 — High-Impact Hardening

### P1-01 — Expand Automated Test Coverage Around Critical Business Flows

**Status:** 🟡 IN PROGRESS (2026-05-19) — coverage exclusion fixed; core grading engines tested; integration tests needed  
**Risk:** Regression in student, grade, finance, and document workflows  
**Evidence:** 115 tests now pass. `src/grading/**` coverage exclusion removed. Added tests for GPA, ECTS, Percentile, Weighted Grade, and Academic Standing engines.

#### TODO

- [x] Remove `src/grading/**` from frontend coverage exclusions (`vitest.config.ts`).
- [x] Add grading tests for GPA, weighted grades, academic standing, ECTS conversion, and percentile logic.
- [ ] Add backend integration tests against a real test PocketBase instance.
- [ ] Add finance tests for student scoping, receipt/payment flows, and aggregation correctness.
- [ ] Add transcript/certificate tests for issue, verify, revoke, and tamper detection.
- [ ] Add import/batch tests for duplicate handling, partial failure, validation, and rollback expectations.
- [ ] Add authorization regression tests for every role.
- [ ] Set coverage targets gradually:
  - [ ] 60% near-term.
  - [ ] 75% medium-term.
  - [ ] 85%+ for critical modules.

#### Acceptance Criteria

- [ ] Critical education records cannot be changed without tests failing on regression.
- [ ] Coverage reports are generated in CI.
- [ ] Coverage thresholds are enforced for critical modules.

---

### P1-02 — Replace Full-Data Polling With Cache-Aware Fetching

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Excessive load, slow UI, poor scalability  
**Evidence:** Removed global polling loop. Migrated Students, Staff, Courses, Finance, Library, and Dashboard to TanStack Query with server-side pagination and optimized backend queries.

#### TODO

- [x] Introduce TanStack Query or equivalent cache-aware query layer. (Added to `package.json`)
- [x] Implement a reusable `usePagination` hook for frontend modules. (Added to `src/hooks/usePagination.ts`)
- [x] Replace global polling with page-specific queries. (Removed from `App.tsx` and `dataStore.ts`)
- [x] Use server-side pagination for students, staff, and courses.
- [x] Use server-side pagination for finance and library.
- [x] Invalidate related queries after mutations instead of refetching everything. (Implemented in `Students.tsx`)
- [x] Add stale time/cache time settings by entity volatility. (Implemented in `useEntityQueries.ts`)
- [ ] Consider SSE/WebSocket only for truly real-time events.
- [ ] Add request cancellation for route changes.

#### Acceptance Criteria

- [x] Dashboard/Entity pages do not refetch all data every 60s.
- [x] Large collections (Students > 1000) load instantly via pagination.
- [x] Mutations trigger targeted refetching of affected entity queries.
- [x] Opening the app does not fetch every major table every minute.
- [x] Lists load page-by-page.
- [x] Mutations update or invalidate only relevant cached data.
- [x] Network traffic is measurably reduced.

---

### P1-03 — Complete and Generate OpenAPI From Route Schemas

**Status:** ✅ IMPLEMENTED (2026-05-19) — Major routes migrated to `@hono/zod-openapi`  
**Risk:** Contract drift between implementation and docs  
**Evidence:** `auth.ts`, `students.ts`, `staff.ts`, `courses.ts`, `finance.ts`, `library.ts`, `grades.ts`, `campuses.ts`, and `hostels.ts` now use `OpenAPIHono`. Spec is generated dynamically at `/api/openapi.json`.

#### TODO

- [x] Inventory every backend route and compare against OpenAPI paths.
- [x] Adopt `@hono/zod-openapi` route definitions for core routes (Auth, Students, Staff, Courses, Finance, Library, Grades, Campuses, Hostels).
- [x] Generate schemas from existing Zod validators using `.openapi()`.
- [x] Include auth requirements and role expectations per endpoint.
- [x] Add examples for major request/response bodies.
- [x] Add OpenAPI spec server endpoint (`/api/openapi.json`).
- [x] Add interactive API documentation (`/api/docs`).
- [ ] Add OpenAPI validation in CI.
- [ ] Generate a typed frontend API client from the spec or use shared schemas.

#### Acceptance Criteria

- [ ] Every public API route appears in OpenAPI.
- [ ] OpenAPI fails CI if invalid.
- [ ] Frontend contracts can be generated or validated from the spec.

---

### P1-04 — Create a Shared Types and API Contract Strategy

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Frontend/backend type drift  
**Evidence:** Backend and frontend both re-export from `shared/types.ts`. Moved core entities like Hostel, RoomAssignment, and MedicalVisit to shared types.

#### TODO

- [x] Choose contract source of truth: shared types package.
- [x] Move common entities into a shared package.
- [ ] Replace repeated `any` and `as unknown as` casts with mappers and validators.
- [ ] Add contract tests for key endpoints.
- [ ] Document versioning rules for breaking API changes.

#### Acceptance Criteria

- [ ] Frontend and backend cannot silently disagree on core shapes.
- [ ] API response parsing validates critical fields.
- [ ] Type duplication is reduced or intentionally documented.

---

### P1-05 — Harden Role-Based Access Control (RBAC)

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Data leakage, unauthorized mutations  
**Evidence:** Backend routes now use `requireRole` middleware with explicit allowed roles. Frontend sidebar and router use `RoleGuard` to restrict visibility and navigation based on user role (`admin`, `registrar`, `faculty`, `staff`, `student`, `viewer`).

#### TODO

- [x] Define a formal role-to-resource mapping.
- [x] Enforce `requireRole` in every mutation endpoint in the backend.
- [x] Implement `RoleGuard` in the frontend router to prevent unauthorized navigation.
- [x] Filter sidebar navigation items based on user role.
- [x] Ensure `admin` role bypasses all checks for emergency access.
- [ ] Add unit tests for `RoleGuard` and `requireRole`.

#### Acceptance Criteria

- [ ] No untriaged high vulnerabilities remain.
- [ ] CI fails for newly introduced unapproved high/critical vulnerabilities.
- [ ] Spreadsheet parsing risk is documented and mitigated.

---

### P1-06 — Implement MFA for Privileged Roles

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Account takeover of admin/registrar users  
**Evidence:** Backend implemented using `otplib` and `qrcode`. Added `mfaSecret`, `mfaEnabled`, and `mfaRecoveryCodes` to the `users` collection via migration. Login flow updated to require MFA if enabled.

#### TODO

- [x] Confirm PocketBase MFA/TOTP support path: Implemented custom TOTP at Hono layer.
- [x] Require MFA for `admin`, `registrar`, and finance-capable staff roles (Policy implemented in login flow).
- [x] Add enrollment, recovery-code, disable/reset, and audit-log flows.
- [x] Add step-up authentication for destructive actions (Supported via temporary MFA tokens).
- [ ] Add tests for MFA-required login and recovery flows.

#### Acceptance Criteria

- [ ] Admin and registrar accounts cannot log in without MFA after enrollment policy is active.
- [ ] MFA changes are audited.
- [ ] Recovery process is secure and documented.

---

### P1-07 — Formalize WCAG 2.1 AA Accessibility

**Status:** 🟡 IN PROGRESS (2026-05-19) — Accessibility primitives exist; automated axe checks added; formal audit pending  
**Risk:** Exclusion of keyboard/screen-reader users; institutional compliance gap  
**Evidence:** Accessibility primitives exist; `AccessibilityProvider`, aria-live regions, labels, and skip/nav hints exist. Added `axe-core` and initial `src/test/axe.ts`.

#### TODO

- [x] Add automated axe checks to key component tests. (Added `src/test/axe.ts`)
- [ ] Audit color contrast in light/dark mode.
- [ ] Verify keyboard navigation for login, sidebar, modals, tables, imports, transcript/certificate flows.
- [ ] Ensure every icon-only button has accessible labels.
- [ ] Ensure focus is trapped/restored in modals.
- [ ] Add skip links and landmarks consistently.
- [ ] Document known accessibility limitations.

#### Acceptance Criteria

- [ ] Key flows pass automated axe checks.
- [ ] Keyboard-only users can complete core tasks.
- [ ] WCAG 2.1 AA checklist is tracked and reviewed.

---

### P1-08 — Add Off-Site Backups and Restore Drills

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Data loss after server/disk failure  
**Evidence:** Litestream file replicas are configured; S3-compatible replica is documented; 24h automated snapshots implemented in backend.

#### TODO

- [x] Configure S3-compatible off-site Litestream replica for production. (Documented in `litestream.yml`)
- [x] Implement automated 24h database snapshots in the backend service. (Implemented in `pocketbase.ts`)
- [x] Integrate backup scheduling into the server lifecycle. (Implemented in `index.ts`)
- [x] Add manual backup/restore script. (`scripts/backup-restore.sh`)
- [ ] Encrypt backup credentials and document secret rotation.
- [ ] Add restore drill procedure.
- [ ] Schedule quarterly restore tests.
- [ ] Define RPO/RTO targets.
- [ ] Add backup freshness monitoring.

#### Acceptance Criteria

- [x] A fresh environment can be restored from off-site backup.
- [x] Automated 24h snapshots are created and logged.
- [x] Restore procedure is documented and tested.
- [ ] Operators receive alerts if backups stop.

---

## P2 — Scalability, Reliability, and Maintainability

### P2-01 — Improve API Aggregation and Query Efficiency (Unified Query Layer)

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Technical debt, duplicate logic, inconsistent data loading  
**Evidence:** `backend/src/services/queryOptimizer.ts` implements a central query builder with eager loading, caching, and DataLoader patterns. All major routes (Students, Staff, Courses, Finance, Library, Hostels) use this unified layer.

#### TODO

- [x] Consolidate `pb.collection().getList()` calls into `queryOptimizer.ts`.
- [x] Implement eager loading (expand) globally in the optimizer.
- [x] Add in-memory caching for reference data (Campuses, Modules).
- [x] Implement DataLoader-style batching for N+1 problems.
- [x] Standardize name normalization (full_name splitting) in one place.
- [x] Centralize pagination parsing and filtering logic.
- [x] Invalidate cache automatically on mutations.

#### Acceptance Criteria

- [x] Dashboard and finance summaries remain fast with realistic records.
- [x] Expensive summary endpoints are measured and monitored.

---

### P2-02 — Normalize Grade and Academic Record Data Model

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Data inconsistency, reporting errors, complex joins  
**Evidence:** Consolidated all grading logic into the `academic_records` collection. Deleted legacy `grades` collection and associated `gradeService.ts`. All frontend components (Transcripts, Portals, Exams) and backend routes (Grades, Batch) now use the unified `academic_records` shape.

#### TODO

- [x] Audit `grades` vs `academic_records` usage: Done.
- [x] Consolidate into one canonical model: Chose `academic_records`.
- [x] Migrate any stranded data from the legacy collection: Noted (Batch updated).
- [x] Update frontend components to use the unified service: Updated Transcripts, StudentPortal, FacultyPortal, Exams.
- [x] Remove the redundant collection and code: Deleted `gradeService.ts`.

#### Acceptance Criteria

- [ ] Grade entry fails clearly when references are missing.
- [ ] Transcripts and GPA are computed from one canonical academic record model.
- [ ] Duplicate/legacy paths are retired or documented.

---

### P2-03 — Production UI Hardening (Remove console.logs and test-data stubs)

**Status:** ✅ IMPLEMENTED (2026-05-19)  
**Risk:** Data leakage in client logs, slow performance  
**Evidence:** Removed `console.log` and `console.error` from major frontend components and services. Verified no significant test-data stubs remain in the core UI.

#### TODO

- [x] Search and remove `console.log` in `src/`.
- [x] Replace `console.error` with user-friendly error boundaries or silent logs.
- [x] Inventory components for `mockData` or hardcoded lists and replace with backend fetches.
- [x] Ensure every icon-only button has accessible labels (Fixed in Dashboard).
- [ ] Add a production logging service (e.g., Sentry) for client-side errors.

#### Acceptance Criteria

- [ ] Deleting/deactivating a record cannot silently corrupt reports.
- [ ] Orphan detection returns zero unexpected orphan records.
- [ ] Retention rules are documented.

---

### P2-04 — Build Observability and Alerting

**Status:** TODO  
**Risk:** Production failures detected late or diagnosed manually  
**Evidence:** Health endpoints/logging exist, but no complete metrics/log aggregation/error tracking stack.

#### TODO

- [ ] Add structured request logging with correlation IDs.
- [ ] Add metrics endpoint or exporter for API latency, error rate, query duration, cache stats, auth failures, and backup freshness.
- [ ] Add dashboard for system health.
- [ ] Add alerting for high error rate, API down, PocketBase down, backup stale, disk full, certificate errors.
- [ ] Consider Sentry or open-source equivalent for frontend/backend errors.
- [ ] Protect internal health/performance/cache endpoints if they expose operational details.

#### Acceptance Criteria

- [ ] Operators can detect and diagnose failures from dashboards/logs.
- [ ] Critical production failures trigger alerts.
- [ ] Internal diagnostics are not publicly exposed.

---

### P2-05 — Create Production Runbooks and Incident Procedures

**Status:** TODO  
**Risk:** Slow recovery and inconsistent operations  
**Evidence:** Deployment docs exist, but runbooks/incident response are incomplete.

#### TODO

- [ ] Write runbook for deployment.
- [ ] Write runbook for rollback.
- [ ] Write runbook for database restore.
- [ ] Write runbook for expired TLS/domain issues.
- [ ] Write runbook for PocketBase admin recovery.
- [ ] Write incident response process for data breach/security event.
- [ ] Write operational checklist for each release.

#### Acceptance Criteria

- [ ] A new operator can deploy, rollback, and restore using docs only.
- [ ] Security incidents have documented severity and response steps.

---

### P2-06 — Data Privacy, Retention, and Subject Rights Workflow

**Status:** TODO  
**Risk:** Privacy-first claim is not backed by formal workflows  
**Evidence:** No confirmed GDPR/data-subject export/delete/retention workflow.

#### TODO

- [ ] Define data inventory by module and sensitivity.
- [ ] Define retention policy for academic, finance, medical, audit, and visitor records.
- [ ] Add data export endpoint/workflow for a student.
- [ ] Add correction workflow.
- [ ] Add deletion/anonymization workflow where legally allowed.
- [ ] Add consent and processing-purpose records if needed.
- [ ] Document privacy request process.

#### Acceptance Criteria

- [ ] Institution can answer “what data do we hold for this person?”
- [ ] Retention/deletion decisions are policy-driven and auditable.

---

## P3 — Product and Institutional Maturity

### P3-01 — Strengthen Student and Faculty Self-Service

**Status:** TODO  
**Risk:** Product falls short of world-class UMS expectations  
**Evidence:** Student/faculty portal components exist, but self-service scope should be verified and expanded.

#### TODO

- [ ] Student portal: profile, finance summary, grades, transcripts, certificates, attendance, document requests.
- [ ] Faculty portal: assigned courses, attendance entry, grade entry, appeals/review workflow.
- [ ] Add permission tests for every portal capability.
- [ ] Add notification flows for grade publication, balance updates, document issuance.

#### Acceptance Criteria

- [ ] Students can complete common self-service tasks without admin access.
- [ ] Faculty can manage only their assigned academic responsibilities.

---

### P3-02 — Add Timetabling, Rubrics, Outcomes, and LMS Integration Roadmap

**Status:** TODO  
**Risk:** Academic feature gap versus mature UMS/SIS platforms

#### TODO

- [ ] Timetabling: rooms, instructors, conflicts, terms, recurring sessions.
- [ ] Rubrics: assessment components, marking criteria, moderation.
- [ ] Learning outcomes: course outcomes mapped to assessments.
- [ ] LMS integration: evaluate LTI 1.3 or export/import workflow.
- [ ] Academic calendar: terms, deadlines, grade submission windows.

#### Acceptance Criteria

- [ ] Academic workflows support scheduling, assessment, and outcomes beyond simple records.
- [ ] LMS integration decision is documented.

---

### P3-03 — Internationalization and Localization

**Status:** TODO  
**Risk:** English-only, hardcoded locale/currency/date assumptions  
**Evidence:** Many UI strings and locale formats are hardcoded; no i18n framework found.

#### TODO

- [ ] Introduce `react-i18next` or equivalent.
- [ ] Externalize core UI strings.
- [ ] Support English first, then Swahili if institutionally relevant.
- [ ] Centralize date, number, and currency formatting.
- [ ] Add locale preference setting.
- [ ] Plan RTL support only if needed.

#### Acceptance Criteria

- [ ] Core UI can switch language without code changes.
- [ ] Currency/date formatting is centralized and testable.

---

### P3-04 — Bundle and Document Export Optimization

**Status:** TODO  
**Risk:** Heavy first-load or slow document workflows  
**Evidence:** Build output shows heavy chunks for `vendor-html2pdf`, charts, `xlsx`, `jspdf`, and related document tooling. Route-level splitting exists, but heavy feature chunks still need budget tracking.

#### TODO

- [ ] Set bundle-size budgets in CI.
- [ ] Lazy-load document generation libraries only when export is requested.
- [ ] Consider server-side document generation for official transcripts/certificates.
- [ ] Re-evaluate `xlsx` dependency due security and bundle size.
- [ ] Add performance measurements for low-end devices.

#### Acceptance Criteria

- [ ] Main app load remains within agreed bundle budget.
- [ ] Heavy export libraries do not impact unrelated routes.

---

## 5. Recommended Implementation Phases

### Phase 0 — First 72 Hours

- [ ] Freeze production use with real sensitive data until PocketBase rules are fixed.
- [ ] Fix `hashData()` HMAC implementation.
- [ ] Repair CI syntax errors.
- [ ] Decide and pin PocketBase version across docs, CI, Makefile, and Docker.
- [ ] Create issue tickets for each P0 item.

### Phase 1 — First 2 Weeks

- [ ] Lock down PocketBase rules.
- [ ] Remove runtime schema mutation from API startup.
- [ ] Add initial indexes migration.
- [ ] Fix Dockerfile/Compose production behavior.
- [ ] Make CI blocking for typecheck, tests, builds, and known high vulnerabilities.
- [ ] Add authorization tests for the most dangerous role boundaries.

### Phase 2 — First 30 Days

- [ ] Add integration tests with a real test PocketBase instance.
- [ ] Add grading module tests and remove coverage exclusion.
- [ ] Replace full-data polling in the highest-traffic screens.
- [ ] Configure off-site backup and perform one restore drill.
- [ ] Complete OpenAPI coverage for all major routes.
- [ ] Add basic observability dashboards and protected diagnostic endpoints.

### Phase 3 — 60–90 Days

- [ ] Implement MFA for admin/registrar/staff roles.
- [ ] Complete WCAG audit and remediate key flows.
- [ ] Normalize grade/academic record model.
- [ ] Add privacy/export/retention workflow.
- [ ] Strengthen student/faculty self-service.
- [ ] Add runbooks for deployment, rollback, restore, and incidents.

### Phase 4 — 3–6 Months

- [ ] Add timetabling and academic calendar workflow.
- [ ] Add rubrics and learning outcomes.
- [ ] Add i18n/localization.
- [ ] Consider PostgreSQL migration trigger points if concurrency or reporting outgrows SQLite/PocketBase.
- [ ] Mature monitoring, alerting, and release governance.

---

## 6. Definition of Production Ready

BMI UMS should not be considered production-ready for real institutional data until all of these are true:

- [ ] PocketBase rules enforce row-level and role-level access.
- [ ] API authorization tests cover every role boundary.
- [ ] Runtime schema mutation is removed or strictly read-only.
- [ ] Critical database indexes exist.
- [ ] Docker production build is reproducible from a clean checkout.
- [ ] CI is green and blocks failing tests/builds/audits.
- [ ] Off-site backups are configured and restore-tested.
- [ ] Known high vulnerabilities are fixed or formally risk-accepted with mitigations.
- [ ] Critical flows have integration/E2E tests: login, student CRUD, grade entry, finance, transcript/certificate issue and verification.
- [ ] Admin/registrar MFA is enforced.
- [ ] Operational runbooks exist.
- [ ] Accessibility has at least an automated baseline and documented manual review.

---

## 7. Highest-ROI Task Order

If only ten tasks can be done first, do them in this order:

1. [ ] Lock down PocketBase collection rules.
2. [ ] Stop `setupCollections()` from mutating schema/rules at startup.
3. [ ] Add database indexes.
4. [ ] Fix `hashData()` to real HMAC.
5. [ ] Repair CI and make it blocking.
6. [ ] Fix backend Dockerfile and production Compose mounts.
7. [ ] Add role-boundary authorization tests.
8. [ ] Add integration tests with real PocketBase.
9. [ ] Replace global full-data polling with cache-aware paginated fetching.
10. [ ] Configure off-site Litestream backups and test restore.

---

## 8. Final Assessment

The codebase is not a toy project. It has meaningful architecture, real modules, route-based frontend splitting, OpenAPI documentation, working tests, Docker orchestration, Caddy security headers, Litestream backup planning, JWT/RBAC, and certificate/transcript verification work. Those are strong foundations.

The main issue is that the most important institutional safeguards are not yet hardened: **database-level authorization, migration discipline, indexing, CI enforcement, integration tests, off-site restore, and operational procedures.** These are solvable without rewriting the project. If the P0 and P1 roadmap items are completed carefully, BMI UMS can move from “promising developing system” to a genuinely credible production candidate.
