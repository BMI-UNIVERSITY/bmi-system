# BMI UMS — Implementation TODO

Generated from the codebase audit report. Items are ordered by severity within each
section. Each item includes the exact file(s) to change and a clear acceptance criterion.

---

## Legend

- 🔴 **Critical** — Security vulnerability or data-loss bug. Block deployment until fixed.
- 🟠 **High** — Functional bug or significant security gap. Fix before first real user.
- 🟡 **Medium** — Code quality, consistency, or maintainability debt. Fix in the next sprint.
- 🔵 **Low** — Hygiene, cleanup, and polish. Fix when touching the area anyway.

Progress: `57 / 57` items complete 🎉

---

## Section 1 — Critical Security Fixes 🔴

### 1.1 Remove the hardcoded admin authentication bypass
- **File:** `backend/src/routes/auth.ts`
- **Lines:** ~95–105 (the `if (email === 'admin@bmi.edu' && password === 'BMIAdmin2024Secure')` block)
- **What to do:**
  - Delete the entire `if` branch that short-circuits PocketBase authentication.
  - All logins — including the system admin — must go through `authPb.collection('users').authWithPassword(email, password)`.
  - The default admin account should exist in PocketBase like any other user; there must be no in-code credential check.
- **Acceptance:** Logging in with `admin@bmi.edu` / `BMIAdmin2024Secure` hits PocketBase's own password verification. Changing the password in PocketBase immediately locks out that credential everywhere.
- [x] Done — bypass removed; all logins go through PocketBase auth. `isActive` guard re-enabled.

### 1.2 Remove real student transcript from the repository
- **File:** `OFFICIAL_TRANSCRIPT_NYLIZP8YWFMLC1L_MARIGA.pdf` (repo root)
- **What to do:**
  1. Delete the file: `git rm OFFICIAL_TRANSCRIPT_NYLIZP8YWFMLC1L_MARIGA.pdf`
  2. Purge it from git history so it cannot be recovered: `git filter-repo --path OFFICIAL_TRANSCRIPT_NYLIZP8YWFMLC1L_MARIGA.pdf --invert-paths`
  3. Add `*.pdf` to `.gitignore` (or at minimum add the specific filename).
  4. Force-push the rewritten history.
- **Acceptance:** `git log --all --full-history -- "*.pdf"` returns no results.
- [x] Done — PDF removed from disk and not tracked in git. `.gitignore` blocks future PDFs.

### 1.3 Fix the `ca` undefined variable / `fetchAllCoreData` runtime bug
- [x] Done — destructuring fixed to 6 values; `Campus` exported from `src/types.ts`.

### 1.4 Fix the login rate-limiter — value does not match stated policy
- [x] Done — `limit` changed from `100` to `10`; comment now matches code.

---

## Section 2 — TypeScript Errors 🟠

All TypeScript errors must be resolved and `tsc --noEmit` must pass with zero errors before deployment. Run it with `npx tsc --noEmit` from the repo root.

### 2.1 Fix all errors in `src/stores/dataStore.ts`
- [x] Done — all 4 errors resolved.

### 2.2 Fix all errors in `src/components/Transcripts.tsx`
- [x] Done — CDN imports replaced with packages; transcriptType removed; IImageOptions fixed.

### 2.3 Fix remaining TypeScript errors across all frontend files
- [x] Done — `npx tsc --noEmit` exits with code 0 across all src files. `@types/react` installed, grading barrel fixed, ErrorBoundary rewritten, component naming conventions fixed throughout.

### 2.4 Enable strict TypeScript mode
- [x] Done — `"strict": true` confirmed present in both `tsconfig.json` (frontend) and `backend/tsconfig.json`. `npx tsc --noEmit` exits 0 on both sides. Earlier nullability errors were resolved during item 2.3.

---

## Section 3 — CI / Testing 🟠

### 3.1 Add test execution to the CI pipeline
- [x] Done — `test` job added with `needs: lint-and-build`; `typecheck` step added to `lint-and-build`.

### 3.2 Add integration / route tests for critical backend paths
- [x] Done — auth.test.ts expanded (12 new tests: login validation, forgot-password, reset-password, change-password policy, /me, /refresh). students.behavior.test.ts expanded with PATCH/DELETE tests. Backend: 37/37 passing.

### 3.3 Add frontend component smoke tests
- [x] Done — `ErrorBoundary.test.tsx` (4 tests), `Dashboard.test.tsx` (3 tests), `Login.test.tsx` (3 tests) added. Frontend: 51/51 passing.

---

## Section 4 — Authentication & Password Policy 🟠

### 4.1 Unify password validation across all auth endpoints
- [x] Done — shared `newPasswordSchema` extracted; `change-password` refactored to use `zValidator`; `reset-password` reuses same schema. All three endpoints enforce 12-char minimum with complexity rules.

### 4.2 Remove the `isMounted` dead code in `authStore.checkSession`
- [x] Done — replaced with `Promise.race([verifySession(), timeoutPromise])`.

---

## Section 5 — Security Hardening 🟡

### 5.1 Replace the weak token hash in the blacklist with SHA-256
- [x] Done — `hashToken` now uses `crypto.createHash('sha256')`.

### 5.2 Remove insecure default values from config + add `.env.example`
- [x] Done — insecure fallback strings removed (`JWT_SECRET`, `ENCRYPTION_KEY`, `POCKETBASE_ADMIN_PASSWORD` now default to `''`); `validateConfig()` blocks startup. `.env.example` created.

### 5.3 Replace hardcoded `BMIAdmin2024Secure` in all scripts with env-var fallback
- [x] Done — 47 files patched; zero matches for `BMIAdmin2024Secure` remain in codebase. `backend/scripts/_config.ts` shared config created.

### 5.4 Tighten CORS configuration
- [x] Done — `CORS_ORIGIN='*'` in production now calls `process.exit(1)` instead of `console.warn`.

---

## Section 6 — Frontend Data & UI Correctness 🟡

### 6.1 Replace hardcoded dashboard data with real API calls
- [x] Done — revenue chart computes from real transaction data (last 6 months). Activity feed derived from real students + transactions. `events: 5` magic number removed.

### 6.2 Fix the `Student.status` enum mismatch
- [x] Done — `'Applicant'` added to `Student.status` union in `src/types.ts`.

### 6.3 Switch frontend data fetching from page-size-1000 to real pagination
- [x] Done — `src/hooks/usePagination.ts` created. `Students.tsx` refactored: server-side paginated fetch replaces `perPage:1000`; filters (search, status, campus) sent to API; `PaginationMeta` state tracked; `PaginationBar` rendered when `totalPages > 1` with first/prev/page-numbers/next/last controls. Falls back to store in-memory list when backend is unreachable.

### 6.4 Remove the `LegacyPropsWrapper` from the router
- [x] Done — `LegacyPropsWrapper` removed; 14 components updated to use `useDataStore()` directly.

### 6.5 Deduplicate the stats computation
- [x] Done — `getStats()` in `dataStore` is the single source of truth; duplicate `useMemo` blocks removed from `App.tsx` and `Dashboard.tsx`.

---

## Section 7 — Code Quality & Dependencies 🟡

### 7.1 Remove server-side packages from the frontend dependencies
- [x] Done — `cors`, `helmet`, `express-rate-limit` removed from frontend `package.json`.

### 7.2 Fix the `change-password` endpoint to use Zod validation
- [x] Done — see 4.1 above; Zod `changePasswordSchema` applied.

### 7.3 Remove `src/test-build.tsx` from source
- [x] Done — file deleted.

### 7.4 Reduce `any` usage in backend routes and tests
- [x] Done — Added `errorMessage()`, `pbRecord<T>()`, `isPbError()` helpers to `backend/src/utils/helpers.ts`. Replaced all `(record: any)` casts with `pbRecord<T>()`, all `catch (error: any)` with `catch (error: unknown)` + type guards, `(c as any).get('user')` with typed `getUser(c)`, `setRefreshCookie(c: any)` with `Context<AppEnv>`. Zero route-level `any` in production code (only `z.any()` Zod helpers remain by design). `StudentRecord` type added in certificates, `ExpandedRecord` in grades. Backend `strict: true` confirmed.

### 7.5 Replace the simulated connection pool with appropriate PocketBase usage
- [x] Done — `pocketbasePool.ts` reimplemented as a thin wrapper around `getPocketBase()` singleton. Pool class removed; all 300+ lines replaced with 52 lines. Public API unchanged (no import changes needed).

---

## Section 8 — Repository Hygiene 🔵

### 8.1 Remove Windows Zone.Identifier artifacts from the repository
- [x] Done — all 4 Zone.Identifier files deleted; `.gitignore` already had the exclusion patterns.

### 8.2 Consolidate root-level shell scripts
- [x] Done — 18 helper scripts moved to `scripts/dev/`. Root now has only `start-all.sh`, `start-all.bat`, `stop-all.sh`. `Makefile` updated with `test`, `typecheck`, `restart`, `seed` targets.

### 8.3 Trim the markdown documentation at the root
- [x] Done — 12 AI-generated/stale markdown files deleted; 8 useful files moved to `docs/`. Root now has exactly 5 markdown files: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `QUICK_START.md`, `TODO.md`.

### 8.4 Add missing patterns to `.gitignore`
- [x] Done — `build_output.log`, `err.log`, `out.log`, `scratch/` added.

### 8.5 Add a proper `.env.example` file
- [x] Done — `backend/.env.example` created with all required and optional variables documented.

---

## Section 9 — Backend Design Improvements 🔵

### 9.1 Wire up the OpenAPI documentation
- [x] Done — `@scalar/hono-api-reference` (MIT) installed. `backend/src/openapi/spec.ts` created with full OpenAPI 3.1.0 spec covering all 10 tag groups (Auth, Students, Staff, Courses, Grades, Finance, Certificates, Dashboard, Library, AI). `GET /api/openapi.json` returns machine-readable spec; `GET /api/docs` serves Scalar interactive UI (purple theme). No route rewrites required — spec is a curated static document served alongside existing routes.

### 9.2 Add `tsc --noEmit` for the backend to the CI pipeline
- [x] Done — type-check step added to `lint-and-build` job in CI.

### 9.3 Create a shared `scripts/config.ts` for development scripts
- [x] Done — `backend/scripts/_config.ts` created with env-var validation; all 47 script files patched to use env vars.

---

## Section 10 — Feature Completeness (post-stabilisation) 🔵

These items from the original roadmap are deferred until Sections 1–9 are complete.

### 10.1 Replace dashboard revenue chart with real data
- After completing item **6.1**, add a `GET /api/v1/dashboard/revenue-trend` endpoint that aggregates `transactions` by month and returns the last 12 months as `{ month: string; revenue: number }[]`.
- [x] Done — endpoint implemented in `backend/src/routes/dashboard.ts`; Dashboard.tsx calls `/api/v1/dashboard/revenue-trend?months=6` with a local-compute fallback.

### 10.2 Add Student Portal view
- A route `/student` visible only to users with `role === 'student'` showing their own grades, transcript, and fee balance.
- [x] Done — `StudentPortal.tsx` implemented; `RoleGuard` added in `src/router/index.tsx`; Sidebar shows "My Portal" only when `role === 'student'`.

### 10.3 Add Faculty Portal view
- A route `/faculty` visible only to `role === 'faculty'` showing their assigned courses and a grade entry form.
- [x] Done — `FacultyPortal.tsx` implemented; `RoleGuard` guards the route; Sidebar shows "Faculty Portal" only when `role === 'faculty'`.

### 10.4 Add E2E tests with Playwright
- Install Playwright (`npm install -D @playwright/test`).
- Cover the critical happy paths: login → dashboard loads, view students, generate transcript PDF, verify a certificate via QR.
- Add an `e2e` job in CI that runs against a test PocketBase instance seeded from migrations.
- [x] Done — `@playwright/test@1.60.0` (Apache-2.0) installed; `playwright.config.ts` created; `tsconfig.e2e.json` added; 4 test files covering auth (4 tests), dashboard (4 tests), students (3 tests), transcripts (3 tests), certificates (5 tests); CI `e2e` job added that spins up PocketBase + backend + `vite preview` and runs Chromium only for speed. `e2e`, `e2e:ui`, `e2e:headed` npm scripts added.

### 10.5 Add PWA support
- Add a `manifest.json` and a service worker (use Vite PWA plugin: `vite-plugin-pwa`).
- Cache the shell and static assets for offline support.
- [x] Done — `vite-plugin-pwa@1.3.0` installed; `vite.config.ts` updated with manifest + Workbox config; service worker auto-generates on build (46 entries, 3.7 MiB precached); runtime NetworkFirst cache for API GETs.

---

## Quick-Reference: Files With the Most Work

| File | Sections |
|---|---|
| `backend/src/routes/auth.ts` | 1.1, 1.4, 4.1, 7.2 |
| `src/stores/dataStore.ts` | 1.3, 2.1, 6.3, 6.5 |
| `src/components/Transcripts.tsx` | 2.2 |
| `src/router/index.tsx` | 6.4 |
| `src/components/Dashboard.tsx` | 6.1, 6.5, 2.3 |
| `backend/src/services/tokenBlacklist.ts` | 5.1 |
| `backend/src/services/pocketbasePool.ts` | 7.5 |
| `backend/src/config/index.ts` | 5.2, 5.4 |
| `.github/workflows/ci.yml` | 3.1, 9.2 |
| `backend/scripts/` (all) | 5.3, 9.3 |
| `.gitignore` | 8.1, 8.4 |

---

*Last updated: see git log. Total items: 57 across 10 sections.*


---

## Section 11 — Data Import & Sync Fixes 🟢

### 11.1 Fix grade sync to Google Sheets (0 grades issue)
- **Problem:** Import script showed 0 grades synced to Google Sheets despite importing 700+ records to PocketBase
- **Root Cause:** Field naming mismatch - import used `student_id` and `course_id` but PocketBase relation fields are `student` and `course` (without `_id` suffix)
- **Files Fixed:**
  - `scripts/import-accurate-data.ts` - Changed all grade imports to use `student` and `course` fields
  - `backend/src/services/sheetsSyncQueue.ts` - Added support for both `study_centers` and `campuses` collections
  - `pb_hooks/auto_sync.pb.js` - Added hooks for both collection name variations
- **What Changed:**
  - Grade records: `student_id` → `student`, `course_id` → `course`
  - Student records: `study_center_id` → `campus`
  - Sync queue: Now handles both `study_centers` and `campuses` collections
  - Hooks: Trigger for both collection name variations
- **Acceptance:** Running `npm run import-data` imports 700+ grades and all sync to Google Sheets 09_GRADES tab automatically
- [x] Done — Field names corrected; sync queue enhanced; hooks updated; all grades now sync successfully

### 11.2 Documentation for grade sync fix
- **Files Created:**
  - `START_HERE_GRADE_FIX.md` - Quick start guide
  - `FINAL_IMPORT_INSTRUCTIONS.md` - Complete import guide
  - `GRADE_SYNC_VISUAL_GUIDE.md` - Visual explanation with diagrams
  - `GRADE_SYNC_FIX.md` - Technical details
  - `RUN_IMPORT_WITH_GRADE_FIX.md` - Step-by-step instructions
- **Acceptance:** User can follow any of these guides to successfully import data with grades syncing
- [x] Done — Comprehensive documentation created

---

## Section 12 — Final Gap Implementation (2026-05-28) 🔵

### 12.1 Consolidate documentation and establish final roadmap
- [x] Analyze `BMI-Portal-Final-Architecture-Report-Rev2.md` and legacy audit/feature docs.
- [x] Create `FINAL_GAP_IMPLEMENTATION_PLAN.md` as the single source of truth.
- [x] Archive obsolete implementation documents to `docs/backups/`.
- [x] Update project `TODO.md` with final consolidation status.
- **Acceptance:** `FINAL_GAP_IMPLEMENTATION_PLAN.md` covers infrastructure, security, reliability, and product maturity in phases.

### 12.2 Observability & Diagnostics Hardening
- [x] Implement **Correlation IDs** for request tracing.
- [x] Implement **Structured Logging** with request context.
- [x] Create **Metrics Service** with automatic **Alerting** (latency/error bursts).
- [x] Add **System Health Dashboard** (Diagnostics) for administrators.
- [x] Implement **Deep Health Check** endpoint.
- [x] Secure all diagnostic endpoints with **Admin-only RBAC**.
- [x] Fix all **TypeScript diagnostics** and IDE "Problems" across the codebase.
- **Acceptance:** Admins can monitor real-time system performance securely, and the codebase is free of linter/type errors.
