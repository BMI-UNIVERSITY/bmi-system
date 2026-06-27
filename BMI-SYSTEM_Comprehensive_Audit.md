# BMI-System Comprehensive Technical Audit
**Repository:** `BMI-UNIVERSITY/bmi-system` (monorepo)
**Audit date:** June 27, 2026
**Method:** Direct static inspection of a fresh clone (commit at clone time), including dependency resolution and `npm audit` against real lockfiles. No dynamic/runtime testing, no live endpoint probing, no Lighthouse/axe scans were performed — those require a deployed instance and are flagged as follow-up work, not assumed.
**Scope:** `apps/api` (Cloudflare Worker, unified backend), `apps/portal` (Vite/React admissions portal), `apps/ums` (Vite/React university management system), `bmi-university` (Next.js marketing site), `packages/shared`, CI/CD, IaC (`terraform/`), and the two audit documents already committed in the repo root.

---

## 0. Executive Summary

This repository is the **realized implementation** of the unification strategy that an earlier audit in this same repo (`BMI-PORTAL_ANALYSIS_REPORT.md`) recommended: it consolidates what used to be two separate codebases/databases/auth systems (PocketBase+Docker UMS vs. Cloudflare D1+Workers Portal) into one monorepo, one Cloudflare Worker (`apps/api`), and one D1 database. That migration is **substantially done and competently engineered** — there is real RBAC, CSRF protection, magic-byte file validation, HMAC-signed webhooks with retry/dead-lettering, audit logging, and a deliberate "single source of truth" data layer.

However, the migration is **not complete**. The evidence shows a system in a transitional state with three classes of problems:

1. **Genuine, fixable security/CI gaps** in the new unified code (CORS trust of `*.pages.dev`, non-distributed rate limiting, CI that deploys without gating on tests, lockfiles deleted before every CI install).
2. **Leftover artifacts from the old PocketBase/self-hosted architecture** that were never cleaned up and actively contradict the new single-DB model in code comments, env templates, and a disabled real-time sync hook — this is the most concrete evidence for the "single source of truth" gaps requested in scope.
3. **Near-zero test coverage on the highest-risk code** — the 2,709 lines of business logic in `apps/api/routes/*` (auth, admin, payments, grades) have effectively no unit tests, while the lower-risk frontend has the bulk of the test investment.

Risk-ranked, the top five items demanding attention before any further production rollout are:

| # | Finding | OWASP/Category | Impact | Likelihood | Priority |
|---|---|---|---|---|---|
| 1 | CI deploys to production on every push to `main` without ever requiring the test job to pass (`continue-on-error: true` on all test steps, no `needs:` gate) | CI/CD Integrity | High | High | **P0** |
| 2 | CORS trusts any `*.pages.dev` origin combined with `Access-Control-Allow-Credentials: true` | A05:2021 Security Misconfiguration | High | Medium | **P0** |
| 3 | Rate limiting is per-isolate in-memory `Map`, not distributed — ineffective at Cloudflare's edge | A04:2021 Insecure Design | Medium-High | High | **P1** |
| 4 | `apps/ums` frontend academic-records/grades layer carries "LOCKED FILE" logic for a dual PocketBase-collection merge that **no longer exists** in the D1 schema, and `useRealtimeSync()` is a disabled no-op | Data Integrity / Sync | High | Medium | **P1** |
| 5 | `apps/api/routes/*` (all business logic: auth, admin, payments, grading) has 0 dedicated unit tests; CI's only test step (`apps/ums`) is `continue-on-error` | Software Testing Maturity | High | High | **P1** |

Full detail, file-level evidence, and tiered remediation follow.

---

## 1. Core Strengths (with evidence)

### 1.1 Architecture — genuinely unified backend
`README.md` states the intended design and the code backs it up: one Cloudflare Worker (`apps/api`) serves **both** `apps/portal` and `apps/ums` over a versioned route surface (`/api/*` for Portal/admissions, `/api/v1/*` for UMS), bound to a single D1 database (`apps/api/wrangler.jsonc`, `d1_databases: bmi-portal-db`), one KV namespace for sessions, and one R2 bucket for documents. `apps/api/index.ts` is a single 280-line route table — there is no second, divergent API implementation per app.

### 1.2 Role-based access control implemented consistently
Every protected route in `apps/api/index.ts` calls `requireAuth(request, env, [roles])`, and `middleware/auth.ts` centralizes the check (JWT verification → live session lookup in KV → role allow-list). Self-protection logic exists for destructive admin actions, e.g. in `routes/admin.ts`:
```ts
if (targetId === actorId) {
  return error('You cannot change your own role', 400);
}
...
if (target.role === 'admin') {
  return error('Admin accounts cannot be deleted. Demote the user first.', 403);
}
```
This blocks privilege self-escalation-by-accident and prevents admin lockout via deletion — a thoughtful, non-default safeguard.

### 1.3 SQL injection safety
Every database call across all 13 route files and `lib/*.ts` uses parameterized `env.DB.prepare(...).bind(...)` — no string-concatenated SQL was found anywhere in `apps/api`. Confirmed by manual review of `admin.ts`, `apply.ts`, `ums-grades.ts`, `webhooks.ts`, and `auth.ts`.

### 1.4 Password and token handling
`apps/api/lib/jwt.ts` implements PBKDF2 with 100,000 iterations and per-user random salt for password hashing, a common-password blocklist, and a complexity validator (`validatePasswordStrength`). JWT signature verification uses WebCrypto `crypto.subtle.verify` (constant-time by design). Inbound/outbound webhook signatures (`lib/webhook.ts`) use HMAC-SHA256 with an explicit constant-time comparison loop:
```ts
let mismatch = 0;
for (let i = 0; i < expected.length; i++) {
  mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
}
return mismatch === 0;
```
This is correct, deliberate timing-attack mitigation — a level of rigor not common in small teams' codebases.

### 1.5 Defense-in-depth HTTP security headers
`apps/api/index.ts`, function `withCors`, sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` with `preload`, a real `Content-Security-Policy` (`default-src 'self'`, no wildcard script-src), `Permissions-Policy` disabling camera/mic/geolocation, and `Referrer-Policy: strict-origin-when-cross-origin`, applied to **every** response uniformly via a single wrapper function rather than per-route.

### 1.6 CSRF protection on state-changing requests
A double-submit-style CSRF check (`validateCsrfToken`) gates all `POST/PUT/DELETE/PATCH` except an explicit, narrow exemption list (login/register/password-reset — routes that legitimately can't carry a pre-issued CSRF token). The exemption list is hardcoded and reviewable, not a blanket bypass.

### 1.7 File upload validation goes beyond client-supplied MIME type
`apps/api/routes/documents.ts` checks magic bytes against a signature table rather than trusting the `Content-Type` header the browser sends, alongside a 10 MB size cap and a 20-files-per-application cap:
```ts
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES_PER_APP = 20;
...
for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) { ... }
...
if (file.size > MAX_FILE_SIZE) return error('File too large. Maximum size is 10 MB.');
```
This defeats a common bypass (renaming a `.php`/`.html` payload to `.pdf`) that pure extension/MIME checks miss.

### 1.8 Outbound integration sync is production-grade in design
`apps/api/lib/webhook.ts` implements HMAC-signed outbound webhooks with exponential backoff (1s → 4s → 16s), non-retryable 4xx short-circuiting, a dead-letter table (`webhook_dead_letters`), and an ops email alert on terminal failure — guarded against alert-loop recursion with an explicit comment (`// Suppress — alert failure must never cause infinite loop`). `apps/api/db/schema.sql` backs this with a dedicated `sync_event_log` table that records every attempt, status, and error for auditability.

### 1.9 Real, working frontend↔backend data sync (not mocked)
`bmi-university/lib/portalApi.js` fetches programs/stats/CMS posts from the live API at build/request time with an 8-second timeout and graceful fallback (`return Array.isArray(data) ? data : []`) rather than hardcoding marketing-site content. The program catalog was previously duplicated and has since been **de-duplicated**, per the in-code fix note:
```js
// Previously this file contained a manually-maintained copy of the program list.
// G-2 fix: the duplicate has been replaced by the single source of truth.
export { PROGRAMS } from '@bmi/shared';
```
This is direct evidence the team is actively closing single-source-of-truth gaps, not just identifying them.

### 1.10 A previously-flagged critical bug appears fixed
The earlier audit (`BMI-PORTAL_ANALYSIS_REPORT.md`, and Joseph's working notes) flagged silent account creation in the marketing-site Apply flow causing guaranteed `409 Conflict` for every applicant. In this codebase, `bmi-university/app/apply/page.jsx` no longer creates an account at all — it collects basic fields and deep-links into the Portal's own registration flow with prefilled query params:
```jsx
// G-1 fix: Do NOT create the account here with a random password.
// Instead, deep-link the user into the portal's own registration flow...
window.location.href = `${PORTAL_URL}/register?${params.toString()}`;
```
This is a clean, low-risk fix (eliminates dual account-creation logic entirely rather than patching it) and should be verified end-to-end in a live environment, but the code-level fix is sound.

### 1.11 Reasonable relational schema with integrity constraints
`apps/api/db/schema.sql` (446 lines, ~26 tables) consistently uses `CHECK` constraints for enums (`status IN (...)`), `ON DELETE CASCADE`/`SET NULL` foreign keys matched to real-world semantics (deleting a user cascades to applications/documents/sessions; deleting a CMS author sets `author_id` to NULL rather than deleting their posts), `json_valid()` checks on JSON-typed columns, and indexes on every foreign key and frequently-filtered column (`idx_apps_status`, `idx_admin_audit_action`, etc.).

### 1.12 UMS frontend has the most mature test investment in the repo
`apps/ums` has 22 unit/component test files plus 6 Playwright end-to-end suites (`e2e/auth.e2e.ts`, `students.e2e.ts`, `dashboard.e2e.ts`, `certificates.e2e.ts`, `transcripts.e2e.ts`) against 161 source files — proportionally the strongest coverage of any package in the monorepo, and the only package with E2E tests at all.

---

## 2. Critical Weaknesses (quantified, with code)

### 2.1 CORS trusts the entire `*.pages.dev` namespace while allowing credentials
`apps/api/lib/types.ts`:
```ts
const isAllowed = allowed.includes(origin) || origin.endsWith('.pages.dev');
...
'Access-Control-Allow-Credentials': 'true',
```
`*.pages.dev` is Cloudflare's **shared, public** subdomain space — any Cloudflare account holder (including an attacker) can spin up a Pages project and receive a `something-random.pages.dev` origin that this check will accept. Combined with `Access-Control-Allow-Credentials: true`, a malicious site at an arbitrary `*.pages.dev` subdomain can issue authenticated `GET` requests (cookies attached) to read data from endpoints not covered by the CSRF check (CSRF in `index.ts` only gates state-changing methods, not `GET`), e.g. `/api/auth/me`, `/api/student/dashboard`, `/api/student/finances`. **Scope:** affects all ~45 authenticated GET routes in `index.ts`. **Severity:** High — credential-bearing cross-origin reads are a textbook CWE-942 (Permissive Cross-domain Policy with Untrusted Domains).

### 2.2 Rate limiting is not actually distributed
`apps/api/middleware/auth.ts`:
```ts
// In-memory rate limit store — avoids costly KV writes on every request.
// Per-isolate state is acceptable for rate limiting at the edge.
const rateLimitMap = new Map<string, RateLimitEntry>();
```
Cloudflare Workers run many concurrent, short-lived isolates across hundreds of PoPs; an in-process `Map` is **not shared between isolates or PoPs**, and isolates are recycled/cold-started frequently. The comment's premise ("per-isolate state is acceptable") is incorrect for a global rate limit — a distributed brute-force attempt (e.g. password-spray across `/api/auth/login`) hitting different edge nodes or triggering new isolates will not be reliably throttled. **Scope:** all rate-limited endpoints, but most consequential on `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password` — none of which have a secondary, durable backstop (no KV- or D1-backed counter exists despite a `rate_limits` table being present in `schema.sql` and apparently unused by `middleware/auth.ts`, which is a second, separate gap: a rate-limiting table was designed but the runtime code doesn't use it).

### 2.3 CI/CD deploys to production without a real test gate
`.github/workflows/deploy.yml`:
```yaml
deploy-api:
  if: github.event_name == 'push'
  ...
deploy-portal:
  if: github.event_name == 'push'
  ...
deploy-ums:
  if: github.event_name == 'push'
  ...
test:
  steps:
    - run: npm run typecheck
      continue-on-error: true
    - run: npm run type-check
      continue-on-error: true
    - run: npm test
      continue-on-error: true
```
None of the three deploy jobs declare `needs: test`, so they run in parallel with (not after, and not gated by) the test job regardless of outcome. Every step inside the `test` job is also marked `continue-on-error: true`, so even if someone added the `needs:` gate, the job would still report success on a failing test or type error. **Net effect: it is currently impossible for a broken build, type error, or failing test to block a production deploy of the API or either frontend.** This is a P0 process-integrity gap, not a code bug — it undermines every other safeguard in this report, because a regression in any of the strengths above (e.g., someone accidentally removing the CSRF check) would still ship.

### 2.4 CI deletes the committed lockfile before every install
Every job in `deploy.yml` runs:
```yaml
run: |
  rm -f package-lock.json
  npm install
```
`package-lock.json` (600KB, committed at the repo root and explicitly called "canonical" in `.gitignore`'s comment: `# root lock file is canonical`) is deleted and regenerated on every single CI run via floating `npm install` rather than `npm ci`. This defeats the entire purpose of a lockfile: dependency versions resolved in CI can drift from what's committed and from what a developer has locally, undermining reproducible builds and silently pulling in new (potentially vulnerable or breaking) transitive versions on every deploy. **Scope:** all 4 CI jobs, every push to `main`.

### 2.5 Zero unit tests on the backend's actual business logic
```
apps/api: 25 source files, 3 test files (jwt.ts, jwt contract test, an OpenAPI snapshot test)
```
The 13 files under `apps/api/routes/` — 2,709 lines covering authentication flows, admin user management, payments (`handlePayInvoice`), grading (`ums-grades.ts`), document access control, and CMS — have **no dedicated unit or integration tests**. The only backend test that runs in CI is `apps/ums`'s frontend test suite; `apps/api` has no `test` script invocation anywhere in `deploy.yml` at all. A regression in, for example, the role-check logic in `handleUpdateUserRole`/`handleDeleteUser` would not be caught by any automated check before reaching production.

### 2.6 Architectural drift: residual PocketBase artifacts contradict the "single D1" model
Three independent pieces of evidence, all consistent with one unresolved migration:

a) `apps/ums/.env.example` still ships:
```
VITE_POCKETBASE_URL=http://localhost:8090
...
LITESTREAM_S3_BUCKET=your-bucket-name-here
# REQUIRED: ... Leaving this placeholder disables off-site backup silently.
```
PocketBase and Litestream (SQLite replication/backup) belong to the **old**, pre-unification UMS architecture per the repo's own `BMI-PORTAL_ANALYSIS_REPORT.md` ("Databases: PocketBase/SQLite vs. Cloudflare D1/SQLite"). The current backend is exclusively D1 (confirmed in `wrangler.jsonc` and every route handler) — this env template documents a backend that the frontend no longer talks to, and its own comment admits a *silent* failure mode if left unconfigured.

b) `apps/ums/src/hooks/useRealtime.ts` — the entire file:
```ts
export function useRealtimeSync() {
  // Real-time synchronization is temporarily disabled.
  // The system now uses a unified Cloudflare D1 backend instead of PocketBase.
}
```
Real-time sync (presumably used for live grade/status updates across the Portal/UMS/staff views) was removed during the PocketBase→D1 migration and **never reimplemented**. Any UI that calls this hook gets a no-op; this is a known, named, but unaddressed functional regression.

c) `apps/ums/src/services/academicRecordsService.ts` carries a "locked file" contract describing logic that does not match the current backend:
```ts
// 🔒 LOCKED FILE — DO NOT SIMPLIFY GRADE FIELD RESOLUTION
// This service talks to GET /api/v1/grades on the backend.
// That endpoint merges data from TWO PocketBase collections:
//   • 'academic_records'  →  g.grade / g.grade_point / g.total_score
//   • 'grades'            →  g.letterGrade / g.gradePoints / g.numericGrade
```
Cross-checked against the actual handler, `apps/api/routes/ums-grades.ts`: `handleListGrades` queries **only** the `grades` table (joined to `enrollments`/`courses`/`students`/`users`) and returns columns `score`, `max_score`, `assessment_type` — **none** of `grade`, `grade_point`, `total_score`, `letterGrade`, `gradePoints`, or `numericGrade` appear anywhere in the response. There is also no `academic_records` table anywhere in `db/schema.sql` or `db/migrations/`. The "locked" frontend fallback-chain is resolving aliases for a data shape that **does not exist on the current backend** — this is either dead code defending against a contract that was already replaced, or (more concerning) evidence that transcripts/GPA displays are silently falling through every alias and rendering blank/`undefined` fields for any grade not matching the legacy shape. **This is the single most concrete, citable piece of evidence of a "single source of truth" gap in the system** and should be the first item resolved (see §5, "Cross-App Sync Analysis").

### 2.7 Dependency vulnerabilities, with specific advisories (via real `npm audit`, not assumed)

| Package | Where | Severity | Advisory |
|---|---|---|---|
| `vitest` (via `@vitest/mocker`/`vite`) | `apps/api` → `packages/shared` devDeps | **Critical** | GHSA — Vitest UI server allows arbitrary file read & execution when `vitest --ui` is running |
| `vite` | `apps/ums`, `apps/portal`, `bmi-university` | High | GHSA-fx2h-pf6j-xcff (`server.fs.deny` bypass on Windows), plus a path-traversal advisory in optimized-deps `.map` handling |
| `dompurify` ≤3.4.10 | `apps/ums` (transitive, via a doc/export library) | Moderate | 8 separate GHSA advisories — IN_PLACE XSS bypasses, hook/config pollution |
| `uuid` <11.1.1 (via `exceljs`) | `apps/ums` | Moderate | GHSA-w5hq-g745-h8pq — buffer bounds check missing |
| `@babel/core` ≤7.29.0 | `apps/ums`/`apps/portal` | Moderate | GHSA-4x5r-pxfx-6jf8 — arbitrary file read via `sourceMappingURL` |
| `brace-expansion` | multiple | Moderate | GHSA-jxxr-4gwj-5jf2 — ReDoS-adjacent DoS protection bypass |

Per-package totals from `npm audit`: **`apps/ums`: 6 (1 high, 4 moderate, 1 low)**; **`apps/api`: 5 (1 critical, 1 high, 3 moderate)**; **`apps/portal`: 5 (1 critical, 1 high, 3 moderate)**; **`bmi-university`: 7 (1 critical, 1 high, 5 moderate)**. The critical/high findings are concentrated in build-tooling (`vite`, `vitest`) rather than runtime server code, which lowers real-world exploitability for a Cloudflare Worker that doesn't run a dev server in production — but `dompurify` is a genuine runtime dependency if used to sanitize any user- or CMS-supplied HTML rendered in `apps/ums`, and should be prioritized regardless of the dev-tooling findings.

### 2.8 Hardcoded infrastructure identifiers committed to a public repo
`apps/api/wrangler.jsonc`:
```jsonc
"account_id": "2557f2f143734abc82bd4c80be750eb6",
"d1_databases": [{ "database_id": "a5e26ad9-5d8e-4afa-9ad9-8cd55c1cbf1a" }],
"kv_namespaces": [{ "id": "56ec1de36fb5404fbb2044e7e649401c" }]
```
The root `README.md` additionally republishes the same `CLOUDFLARE_ACCOUNT_ID` in prose. None of these IDs are secrets in the sense that they grant access on their own (an API token is still required), but Cloudflare account/resource IDs are exactly the kind of reconnaissance data that should not be unnecessarily public — they narrow an attacker's target enumeration and make spear-phishing against the account holder (impersonating Cloudflare support referencing the real account ID) more credible. Low likelihood, low-to-medium impact, but free to fix.

### 2.9 Timing-unsafe password comparison (minor, contrasts with §1.4/§1.6's good practice elsewhere)
`apps/api/lib/jwt.ts`, `verifyPassword`:
```ts
return hashHex === storedHash;
```
This is a plain string comparison, not constant-time, unlike the project's own HMAC verification code in `lib/webhook.ts` which explicitly implements constant-time comparison two files away. In practice network jitter dominates any micro-timing signal here, so exploitability is low, but it is an internal inconsistency worth fixing given the team has already written the correct pattern elsewhere in the same codebase.

### 2.10 Orphaned/contradictory deployment artifacts
`apps/ums/Dockerfile.frontend` and `apps/ums/.dockerignore` describe a Docker/Caddy self-hosted deployment path ("This container has one job: populate the volume... Caddy continues serving the files") that references a `docker-compose.yml` build-arg pattern (`VITE_VERIFY_URL`) — but **no `docker-compose.yml` exists anywhere in the repository** (confirmed via full-repo search), and the actual, documented, CI-driven deployment target for UMS is Cloudflare Pages (`apps/ums/DEPLOY.md`, `.github/workflows/deploy.yml`). This is dead weight from the pre-unification self-hosted architecture (consistent with the OCI/Docker hosting plan documented in the prior BMI Portal infra work) that was not removed when the team standardized on Cloudflare Pages. It actively misleads anyone reading `apps/ums` cold into thinking Docker is a supported deploy path.

### 2.11 Stale CI configuration left in repo (`.github_backup/`)
`.github_backup/workflows/bmi-portal.yml` and `bmi-university.yml` (32 lines each) reference a working directory `./bmi-portal` that is now an **empty placeholder folder** at the repo root (confirmed empty via directory listing) — these are dead CI definitions from before the monorepo merge, sitting in a `.github_backup` directory that GitHub Actions will not execute (correct, since it's outside `.github/workflows`) but that nonetheless adds confusion for any new contributor about which CI definitions are live.

### 2.12 Accessibility coverage is low and unverified
Of 72 `.tsx` files in `apps/ums/src`, only 8 (~11%) contain any `aria-label` or explicit `role` attribute. This is a directional signal, not a WCAG conformance measurement — no automated `axe`/Lighthouse scan was run (none is wired into CI either; see §3.3) — but it indicates accessibility was not a first-class design constraint for the majority of UMS components, which serve staff, faculty, and students who may rely on assistive technology.

### 2.13 Tech-debt markers and debug output
16 `TODO`/`FIXME`/`HACK`/`XXX` markers and 25 files containing non-test `console.log` calls were found across `apps/*` (excluding `node_modules`). This is a moderate, not alarming, count for a project of this size, but `console.log` in `apps/api` Worker code is worth a specific callout: Cloudflare Workers logs are ephemeral unless explicitly shipped to an observability sink (see §3.6 — none is configured), so these statements are providing no durable production diagnostic value today.

---

## 3. Functional & Non-Functional Gaps

### 3.1 Disabled real-time sync feature
Covered in §2.6(b). `useRealtimeSync()` is a stub. If any roadmap or stakeholder expectation includes "staff sees grade/status changes live without refresh" — which the function's name and the dead-letter/webhook infrastructure elsewhere strongly imply was a design goal — it is currently unimplemented in the UI layer regardless of backend capability.

### 3.2 Grade/transcript data-shape mismatch (functional risk, not just hygiene)
Covered in §2.6(c). Until verified live, treat this as a likely-broken or partially-broken transcript/GPA display path, not merely a cosmetic comment mismatch — the "LOCKED FILE" contract explicitly assumes backend fields that the current handler does not return.

### 3.3 No accessibility testing in CI
No `axe-core`, `pa11y`, or Lighthouse-CI step exists in `.github/workflows/deploy.yml` or any `package.json` script across the four apps. Combined with the low `aria-*` density in §2.12, there is currently no mechanism — automated or manual gate — preventing accessibility regressions from shipping, and no documented WCAG 2.1 target level (A/AA/AAA) was found in any README, CONTRIBUTING.md, or AGENTS.md reviewed.

### 3.4 No cross-browser/device test matrix
`apps/ums/playwright.config.ts` exists and E2E tests run, but Playwright's project/browser matrix was not configured for multi-browser runs in the CI job (`deploy.yml`'s `test` job only runs `npm test`, the Vitest unit suite — not `npm run test:e2e` / `npx playwright test`). Playwright E2E tests exist in the repo but **are not executed in CI at all**, only locally via the `test:e2e`/`e2e` package.json scripts — meaning the most realistic, full-browser-stack tests the team has written provide zero protection against regressions reaching `main`.

### 3.5 No dependency-vulnerability scanning in CI
No Dependabot config (`.github/dependabot.yml`), no CodeQL workflow, and no `npm audit`/`audit-ci` step exists anywhere in `.github/workflows/`. The vulnerabilities catalogued in §2.7 would not have been caught automatically by anything currently wired into this repository — they were only surfaced by this manual audit.

### 3.6 No production error tracking or observability integration
No Sentry, Cloudflare Workers Logpush, Tail Worker, or any third-party APM/error-tracking SDK was found in `apps/api/package.json`, `wrangler.jsonc`, or any frontend `package.json`. The Worker's only error handling is `console.error('Worker error:', e)` inside a top-level try/catch in `index.ts`, which (per §2.13) is not durably captured anywhere. For a system handling admissions, grading, and payments, there is currently no way to be alerted to a spike in 500s, a failed payment webhook, or an auth bypass attempt other than someone manually checking Cloudflare's dashboard or the `admin_audit_logs`/`sync_event_log` tables.

### 3.7 Payment flow has no idempotency safeguard visible at this layer
`handlePayInvoice` exists as a route (`/api/student/invoices/:id/pay`) but was not reviewed in source in this pass beyond its registration in `index.ts`; given the prior, separately-documented finding (in Joseph's broader portfolio of audits) of a payment-idempotency gap on a sibling project, this route specifically warrants a dedicated re-check for duplicate-webhook/duplicate-click protection before go-live — flagged here as a gap to verify, not a confirmed defect in *this* repo, since the handler body itself was outside this pass's line-level review.

### 3.8 Documentation describes a roadmap state that should be re-validated against the live site
`BMI-University-Website-Audit.md` (committed in this repo) explicitly notes its own findings are based on **manual inspection of the live site**, not automated Lighthouse/axe/analytics data, and flags that those instrumented numbers "should be run separately for hard numeric benchmarks." That gap is real and still open — there is no CI-integrated Lighthouse run for `bmi-university` either.

---

## 4. Production Deployment Readiness

| Dimension | Status | Evidence |
|---|---|---|
| **Environment config completeness** | Partial | `apps/ums/.env.example` and `apps/portal/.dev.vars.example` exist; `apps/api` relies on `wrangler secret put` (good) but the env template references a defunct backend (§2.6a) |
| **Secrets management** | Good, with one caveat | `JWT_SECRET`, `RESEND_API_KEY`, `ADMIN_SETUP_KEY`, presumably `WEBHOOK_SECRET` are all handled via Cloudflare's `wrangler secret put` (never committed) — correct practice. Caveat: `account_id`/`database_id`/KV `id` are committed in plaintext (§2.8) |
| **Containerization (Docker)** | Inconsistent/orphaned | Only `apps/ums/Dockerfile.frontend` exists, references a non-existent `docker-compose.yml` (§2.10); not part of the live deploy path |
| **CI/CD build+test+deploy** | **Not production-grade** | Tests don't gate deploys; lockfile deleted pre-install every run; no security scanning; E2E suite unused in CI (§2.3, §2.4, §3.4, §3.5) |
| **DB migrations** | Adequate | `apps/api/db/migrations/001_add_ums_columns.sql` plus a `_migrations` tracking table in `schema.sql` shows a real (if early-stage, single-file-so-far) migration discipline rather than ad hoc schema edits |
| **Observability/error tracking** | **Absent** | No Sentry/Logpush/Tail Worker integration found (§3.6) |
| **TLS** | Inherited, not configured in-repo | Cloudflare Workers/Pages terminate TLS automatically; nothing to configure at this layer, but also nothing to audit — HSTS is correctly set in app code (§1.5) |
| **Least-privilege access** | Good at the app layer | RBAC enforced per-route (§1.2); Cloudflare API token scope used in CI was not visible from the repo (token itself is a GitHub secret, correctly not committed) — recommend verifying the token is scoped to only Workers+Pages permissions, per the README's own instruction, rather than a broader account token |
| **Data encryption** | At-rest via platform | D1/R2/KV encryption at rest is a Cloudflare platform guarantee, not app-configured; application-layer encryption of sensitive fields (e.g. `mfa_secret`) was not found — `mfa_secret` is stored in plaintext in the `users` table per `schema.sql`, which is a real, fixable gap (TOTP secrets should be encrypted at the application layer, not just rely on platform-level disk encryption) |

**Critical blockers to a stable, secure production rollout, in order:**
1. Fix the CI gating issue (§2.3) — this is a blocker because it means *every other fix in this report* can be silently reverted by a future commit with no safety net.
2. Resolve the CORS `*.pages.dev` trust (§2.1).
3. Resolve or confirm-safe the grades data-shape mismatch (§2.6c) before any grading/transcript feature is relied upon for real academic records.
4. Add observability (§3.6) — without this, none of the above can be confirmed fixed in production, only in code review.

---

## 5. Cross-App Sync & Single-Source-of-Truth Analysis

**What's actually unified today (confirmed by code, not just by README claim):**
- **Auth:** one JWT issuer, one secret, one session store (KV) — `apps/portal` and `apps/ums` both call the same `/api/auth/*` and `/api/v1/auth/*` handlers in `apps/api`. ✅ Real.
- **Core data:** one D1 database, one schema, no per-app duplicate tables for users/applications/courses/enrollments. ✅ Real.
- **Marketing-site content:** `bmi-university` now pulls programs/stats/posts from the same API live (§1.9) rather than maintaining a parallel copy. ✅ Real, and an explicitly-tracked fix (`G-2 fix`) from a prior audit cycle.
- **Outbound notifications:** a single, well-built webhook dispatcher (§1.8) for any external system that still needs to be told about events (e.g. application status changes) — this is the *correct* pattern for genuinely external systems, and it is **not** being used as a crutch to sync what should just be shared-DB reads, which is good architectural discipline.

**What is not yet unified, with evidence:**
- **The UMS frontend's mental model of its own data is stale.** The "locked" academic-records contract (§2.6c) documents and defends a two-collection PocketBase merge that the backend abandoned. This is the clearest sign that the *frontend* was not fully re-validated against the *backend* after the database migration — the migration moved the data, but didn't fully audit every frontend consumer's field-mapping assumptions against the new shape.
- **Real-time propagation between apps doesn't exist.** A shared database guarantees eventual consistency on next page load/query, not live propagation. The disabled `useRealtimeSync()` (§2.6b) means if a registrar updates a grade in UMS, a student viewing their transcript in another tab/session will not see it without a manual refresh — there is no D1 change-data-capture, no WebSocket/SSE channel, and no polling fallback visible in the reviewed hooks. If "students see grade updates without refresh" is a real requirement, it needs a deliberate replacement (e.g., short-interval polling via `@tanstack/react-query`'s `refetchInterval`, which is already a dependency in `apps/ums/package.json` and would be the lowest-effort fix, or a Durable-Objects-backed WebSocket channel for true push).
- **Env templates lag the architecture they describe.** `apps/ums/.env.example` (§2.6a) is the one artifact a new developer reads first when onboarding to this app, and it currently documents a backend (PocketBase) and a backup tool (Litestream/S3) that the rest of the system has moved away from. This isn't just stale docs — the comment `"Leaving this placeholder disables off-site backup silently"` shows the team is aware this template still drives a real (if orphaned) behavior path, which is exactly the kind of silent-failure risk that single-source-of-truth efforts are supposed to eliminate.
- **No automated contract test between `apps/api` and its consumers.** `apps/api/lib/openapi.snapshot.test.ts` exists and snapshot-tests the API's own OpenAPI document — a good practice for catching *accidental* API surface changes — but there is no corresponding consumer-side contract test (e.g., Pact, or even a simple integration test in `apps/ums`/`apps/portal` that hits a local/staging worker and asserts the response shape matches what `academicRecordsService.ts` or `authService.ts` expect). The OpenAPI snapshot would catch "did the API shape change" but nothing currently catches "did a frontend's assumption about the API shape go stale," which is precisely what happened in §2.6c.

**Recommendation for closing the gap (tiered):**
1. **Immediate:** Audit every field the `academicRecordsService.ts` "locked" fallback chain references against the live `/api/v1/grades` response; delete the dead PocketBase-era aliases or restore the second collection if it's still needed elsewhere, and remove the "locked file" warning once the contract is rewritten to match reality.
2. **Immediate:** Delete or clearly relabel `VITE_POCKETBASE_URL`/`LITESTREAM_S3_BUCKET` in `apps/ums/.env.example` as deprecated, or finish wiring an actual D1-native backup story (Cloudflare D1 has its own time-travel/backup features that may make Litestream redundant now) and update the comment accordingly.
3. **Short-term:** Decide explicitly whether live cross-app propagation is a real product requirement. If yes, replace `useRealtimeSync()` with `react-query` polling (cheap, already available) as an interim step, and scope a Durable Objects/WebSocket design only if true push semantics are needed. If no, delete the stub and its callers to remove the false signal that this capability exists.
4. **Short-term:** Add one consumer-side integration test per frontend app that hits a running `wrangler dev` instance and asserts response shape for the 3–5 highest-traffic endpoints (`/api/v1/grades`, `/api/auth/me`, `/api/public/programs`), so a future backend shape change fails CI instead of failing silently in a transcript view months later.

---

## 6. Tiered Remediation Plan

**P0 — before next deploy:**
- Add `needs: test` to all three deploy jobs in `.github/workflows/deploy.yml` and remove `continue-on-error: true` from the test job's steps (§2.3).
- Stop deleting `package-lock.json` in CI; use `npm ci` against the committed lockfile (§2.4).
- Replace `origin.endsWith('.pages.dev')` with an explicit allow-list of the project's actual Pages domains (already partially present via `ALLOWED_ORIGINS_OVERRIDE`); never wildcard-trust a shared public subdomain namespace when `Allow-Credentials: true` is set (§2.1).

**P1 — this sprint:**
- Move rate limiting to a durable, edge-shared store (Cloudflare's native Rate Limiting rules, or KV/D1-backed counters using the already-defined-but-unused `rate_limits` table) (§2.2).
- Resolve the grades data-shape mismatch per §5, step 1.
- Wire the existing Playwright E2E suite into CI (§3.4) — it already exists and is currently dead weight.
- Add `npm audit --audit-level=high` (or Dependabot) as a CI step across all four `package.json` workspaces (§3.5, §2.7).
- Encrypt `mfa_secret` at the application layer before storing it in D1, or at minimum confirm Cloudflare D1's at-rest encryption is the only intended control and document that decision (§4).

**P2 — this quarter:**
- Add Sentry (or Cloudflare's native Tail Worker → Logpush pipeline) for the Worker and both frontends (§3.6).
- Remove `apps/ums/Dockerfile.frontend`/`.dockerignore` or finish the self-hosted path with a real `docker-compose.yml`; pick one deployment story and delete the other (§2.10).
- Delete `.github_backup/` and the empty `bmi-portal/` placeholder directory at repo root, or document explicitly why they're retained (§2.11).
- Backfill unit tests for `apps/api/routes/*`, prioritizing `auth.ts`, `admin.ts`, and `student.ts` (payments) given their blast radius (§2.5).
- Replace the plain string comparison in `verifyPassword` with a constant-time comparison consistent with the pattern already used in `lib/webhook.ts` (§2.9).
- Stop committing Cloudflare account/database/KV IDs to a public repo; move them to repo/environment secrets or a `.gitignore`d local config (§2.8).
- Run an automated axe/Lighthouse pass against a staging deploy of `apps/ums` and `bmi-university` and set a measurable WCAG 2.1 AA target (§2.12, §3.3, §3.8).

---

## Appendix — Quantitative Snapshot

| App | Source files | Test files | Approx. test:source ratio |
|---|---|---|---|
| `apps/api` | 25 | 3 | 12% (and 0 route-handler tests specifically) |
| `apps/portal` | 26 | 4 | 15% |
| `apps/ums` | 161 | 22 (+6 E2E, unused in CI) | 14% |
| `bmi-university` | 15 | 3 | 20% |
| `packages/shared` | 5 | 2 | 40% |

| App | npm audit total | Critical | High | Moderate |
|---|---|---|---|---|
| `apps/api` | 5 | 1 | 1 | 3 |
| `apps/portal` | 5 | 1 | 1 | 3 |
| `apps/ums` | 6 | 0 | 1 | 4 (+1 low) |
| `bmi-university` | 7 | 1 | 1 | 5 |

*(All `npm audit` figures generated against real, freshly-resolved lockfiles during this audit — not estimated.)*
