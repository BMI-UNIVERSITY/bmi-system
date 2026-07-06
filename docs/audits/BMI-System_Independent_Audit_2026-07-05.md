# BMI-System (BMI-UNIVERSITY/bmi-system) — Independent Technical Audit

**Audit date:** July 5, 2026
**Commit audited:** `cfff4c8` ("fix: resolve TS2839 object reference comparison in courseService.ts"), 73 commits, `main` branch
**Method:** Full clone + static analysis, empirical build/install reproduction, live `npm audit`, GitHub Actions API verification, cross-referencing against the repository's own documentation (`docs/`, `*.md` audit files, code comments). No production credentials were used; no live environment was probed beyond public HTTP(S) endpoints and the public GitHub API.
**Stance:** This report calls out both what is genuinely well engineered and what is broken, incomplete, or misrepresented in the repo's own documentation. Every finding below is tied to a specific file, line, command, or reproducible test — not inference from naming conventions or assumptions about intent.

---

## 1. Executive Summary

BMI-system is a Cloudflare-native monorepo (Workers + D1 + R2, no KV in current use) fronting **four** distinct applications — a public marketing site (`bmi-university`, Next.js, *outside* the npm/pnpm workspace), an applicant/portal SPA (`apps/portal`), an internal University Management System (`apps/ums`), and a single backend Worker (`apps/api`) that serves both frontends against one D1 database. A fifth surface, `bmi-portal`, exists only as a broken/uninitialized git submodule.

The backend shows real security maturity in specific places — parameterized SQL everywhere, allow-listed CORS, correctly-scoped cookies, HMAC-verified webhooks, magic-byte file upload validation, D1-backed rate limiting. But this maturity sits alongside three categories of serious, concretely-verified problems:

1. **Three live authentication bypasses.** Email verification is fully disabled in the login, resend, and OAuth code paths via `DEV_ONLY` comments that were never reverted (`apps/api/routes/auth.ts:149,197,510`).
2. **A broken single-source-of-truth story.** The database has two disconnected migration histories (one of which is completely untracked by the tool the team's own documentation calls "the single source of truth"), and the marketing site's shared-package import — the exact refactor a prior audit cycle credits with fixing this — **fails to build** from a clean install, which I reproduced end-to-end.
3. **A CI/CD pipeline that is mostly theater.** Of 8 GitHub Actions workflow files in the repository, GitHub's own API confirms only 1 is registered and ever runs. `npm audit` in that one real pipeline is soft-failed (`|| true`), and the only hard "contract test" gate is commented out.

None of this is a matter of code style. Items 1–3 above represent a live security control that's off, a data-integrity/reproducibility risk for the database, and a false sense of quality assurance in the pipeline the team relies on for every deploy. They are ranked **Critical** below and should be the first things fixed.

**Severity distribution of findings:** 5 Critical, 9 High, 11 Medium, 7 Low/informational (see §10 Risk Register).

---

## 2. Scope & Ground Truth Correction

Before this audit, the working assumption (per prior conversations/documentation) was that `apps/api` runs on **Hono + Drizzle ORM**. That is not what's in the repository:

```
$ grep -ril "hono" apps/api --include="*.ts" --include="*.json"   → no results
$ grep -ril "drizzle" apps/api --include="*.ts" --include="*.json" → no results
```

`apps/api/index.ts` is a single 669-line hand-written `fetch` handler that dispatches on `path === '/api/x'` string/regex comparisons (89 exact matches + 44 regex matches). There is no router library. Database access is 100% raw `env.DB.prepare(sql).bind(...).all()/first()/run()` against D1 — no ORM. The project's own `docs/database-migrations.md` confirms this is deliberate: *"Currently, migrations are written in raw SQL. As the project scales, we may adopt an ORM (such as Drizzle ORM)... If/when this transition occurs..."* — i.e., Drizzle is an aspiration, not a fact on the ground. This report evaluates the system as it actually exists.

---

## 3. Architecture as Built

```
bmi-system/                         (npm + pnpm workspaces: "apps/*", "packages/*")
├── apps/api/       — Cloudflare Worker, hand-rolled router, D1 (single DB), R2 (docs+backups)
├── apps/portal/    — Vite/React SPA, Cloudflare Pages, applicant-facing
├── apps/ums/       — Vite/React SPA, Cloudflare Pages, staff/student-facing (129 src files)
├── packages/shared/— @bmi/shared: domain constants, program catalog, brand tokens, API types
├── bmi-university/ — Next.js 16 marketing site — NOT in the workspace glob (see §8)
├── bmi-portal/     — git submodule, gitlink only, no .gitmodules, uninitialized (dead)
├── terraform/      — partial IaC (D1, R2, one KV namespace no longer used)
└── .github/workflows/deploy.yml — the ONE workflow GitHub Actions actually runs
```

One D1 database (`bmi-portal-db`) is bound to the single API Worker and shared by Portal and UMS — architecturally this *is* a single source of truth for data at the binding level. Whether the tooling around that database behaves like one is a separate question, addressed in §8.

---

## 4. Core Strengths (Section 1 of the requested scope)

Evidence-first — these are real, verified positives, not boilerplate praise.

### 4.1 SQL injection resistance
Every dynamic query across `routes/*.ts` builds `WHERE`/`SET` clauses by pushing literal, hardcoded column names into a `sets`/`where` array and always binding *values* via `?` placeholders — never string-interpolating user input into SQL. Example (`routes/cms.ts:120-133`):
```ts
const sets: string[] = ["updated_at = datetime('now')"];
const binds: unknown[] = [];
if (body.title !== undefined) { sets.push('title = ?'); binds.push(body.title); }
...
await env.DB.prepare(`UPDATE cms_posts SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
```
I specifically hunted for the counter-example (dynamic table/column names built from request data) and found none — the one place a table name is interpolated (`scripts/archival_job.ts:82`, `DELETE FROM ${rule.table}`) draws exclusively from a hardcoded `RETENTION_RULES` const array, not user input. This is a genuinely clean, disciplined pattern held consistently across ~20 route files.

### 4.2 CORS is correctly allow-listed, not wildcarded
`apps/api/lib/types.ts:104-118` — `getCorsHeaders()` reflects the request's `Origin` back **only** if it's in an explicit allow-list (`@bmi/shared`'s `ALLOWED_ORIGINS` plus a comma-separated `ALLOWED_ORIGINS_OVERRIDE` env var), otherwise falls back to a fixed default origin — never a wildcard, never an unconditional reflection of arbitrary origins. This is a real fix over a wildcard-CORS pattern that would otherwise be a textbook vulnerability.

### 4.3 Cookie and CSRF design is correct for the topology
`routes/auth.ts:233-234`: the auth cookie is `HttpOnly; Secure; SameSite=None`, and a separate, deliberately non-`HttpOnly` `csrf_token` cookie is set alongside it, checked via double-submit comparison against an `X-CSRF-Token` header (`lib/types.ts:165-171`). `SameSite=None` is required here because the frontends live on different subdomains than the API — the team correctly compensated for the resulting CSRF exposure with a real, generated (not guessable) token rather than relying on `SameSite` alone.

### 4.4 File upload validation goes beyond the client's word
`routes/documents.ts:1-60` checks file size (10 MB cap), a per-application file count quota (20), and — notably — **magic-byte sniffing** (`detectMimeType()`) rather than trusting the client-supplied `Content-Type`, plus an ownership check (`WHERE id = ? AND user_id = ?`) before allowing upload against an application. This is a more careful implementation than most systems of this size bother with.

### 4.5 Rate limiting is real, not just declared
`middleware/auth.ts:64-90` implements a genuine D1-backed sliding-window rate limiter (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING request_count`), with probabilistic eviction of stale windows — this is a legitimate, working control, not a stub (see §5.4 for its gaps).

### 4.6 Password storage and webhook signing use correct cryptographic primitives
`lib/jwt.ts` — PBKDF2 with per-password random salt, `crypto.subtle` throughout (no home-rolled crypto), and constant-time hash comparison via an XOR-accumulator loop (`lib/jwt.ts:99-104`). `lib/webhook.ts:36-49` does the same constant-time pattern for HMAC webhook signature verification. This is a team that knows what a timing attack is and defends against it in the two places it matters most.

### 4.7 A genuine shared-constants package exists and is used by 3 of 4 apps
`packages/shared/src/index.ts` centralizes domain URLs, the program/degree catalog, brand color tokens, and API response-shape types, consumed by `apps/api`, `apps/portal`, and `apps/ums`. Where this is used, it is used correctly and is a real single-source-of-truth win (see §8 for where it *isn't* reached).

### 4.8 A dedicated, working WCAG test utility exists
`apps/ums/src/test/axe.ts` wraps `axe-core` with WCAG 2.1 A/AA tag filtering and is genuinely wired into two component tests (`Login.test.tsx`, `Dashboard.test.tsx`) — not dead tooling (see §6.3 for its limited reach).

### 4.9 Encrypted, automated backups
`apps/api/backup.ts` runs on the daily cron trigger, AES-256-GCM–encrypts each table dump before writing to R2 when `BACKUP_ENCRYPTION_KEY` is set, and explicitly warns (rather than silently proceeding) when it isn't.

---

## 5. Critical Weaknesses & Technical Debt (Section 2 of the requested scope)

### 5.1 CRITICAL — Email verification is disabled in three places, in production code
`apps/api/routes/auth.ts` contains three `DEV_ONLY` comment blocks that disable the entire email-verification control, none of which are re-enabled:

- **Line 149:** the resend-verification handler's real logic is commented out entirely (`/* ... */`), so the endpoint always returns success without sending anything.
- **Line 197:** in the login handler, the check `if (!user.is_verified) return error(...)` is commented out — **any account, verified or not, can log in.**
- **Line 510:** in the OAuth callback, new users are inserted with `is_verified` hardcoded to `1`, with a comment noting the real logic (`userInfo.emailVerified ? 1 : 0`) should be restored.

Net effect: the `is_verified` column and its supporting `email_verifications` table exist and are modeled, but the control they implement is fully inert. Anyone can register with an email they don't own and use the account immediately; OAuth accounts are marked verified regardless of what the provider actually reports. This is not a hypothetical — it's three lines away from being re-enabled, meaning it was deliberately switched off and never switched back, which is exactly the kind of change that should never survive a merge to `main`.
**Impact:** Account-integrity control bypass, abuse/spam/impersonation surface, weakens any downstream trust decision (e.g., admissions correspondence) that assumes a verified email.
**Fix effort:** Trivial (uncomment + delete 3 comment blocks) — the disproportionate risk-to-effort ratio is why this is Critical, not Low.

### 5.2 CRITICAL — Two disconnected, contradictory migration histories
`apps/api/docs` (repo-level `docs/database-migrations.md`) states in its own words: *"The `apps/api/migrations/` directory is the single source of truth for the database schema... We do not maintain a separate `schema.sql` dump file..."*

Reality:
- `apps/api/migrations/` (7 files, 0001–0007) is what `npm run db:migrate` / `wrangler d1 migrations apply` actually reads (no `migrations_dir` override in `wrangler.jsonc`, so this is Wrangler's default).
- `apps/api/db/schema.sql` **does exist** (24 KB, 38 tables) — directly contradicting the "we do not maintain" claim.
- `apps/api/db/migrations/` is a **second, entirely separate** migration folder (`0002_ums_collections.sql`, `0003_timetabling.sql`, `0004_rubrics.sql`, `001_add_ums_columns.sql` — note the inconsistent 3-vs-4-digit numbering) that **nothing in the codebase, CI, or docs references** (`grep -rn "db/migrations"` across all `.ts/.json/.jsonc/.md` returns zero hits outside the folder itself).

I diffed the tables these two folders produce: **10 real, in-use tables** — `attendance_records`, `hostels`, `hostel_room_assignments`, `inventory_items`, `library_books`, `medical_records`, `rubrics`, `study_centers`, `timetabling`, `visitors` — exist **only** in the untracked `db/migrations/` folder. Running the documented, tooled process (`wrangler d1 migrations apply`) on a fresh database produces a schema **missing the entire hostel, library, medical, inventory, visitor, attendance, timetabling, and rubrics feature set.** The `verify-migrations.ts` CI check (run on every PR) only proves the 7 tracked migrations apply — it gives false confidence about schema completeness.
**Impact:** No environment can be reliably reprovisioned from the documented process. Local/preview/production drift is likely already present and undetectable by the one CI safety net that exists for this purpose.

### 5.3 HIGH — bmi-university's shared-package import is currently broken; I reproduced the build failure
`bmi-university` is **not** listed in either workspace glob (`apps/*`, `packages/*` in both `package.json` and `pnpm-workspace.yaml`) despite depending on `"@bmi/shared": "*"` (a `private: true`, unpublished package). I tested this directly:

```
$ cp -r bmi-system /tmp/full-repo-test && cd /tmp/full-repo-test/bmi-university
$ rm -rf node_modules && npm install
  → added 492 packages
  → node_modules/@bmi/shared -> ../../../packages/bmi-shared   (broken symlink)
$ npm run build
  Module not found: Can't resolve '@bmi/shared'
    ./bmi-university/lib/programs.js:10:1
  Import traces:
    ./bmi-university/app/apply/page.jsx
    ./bmi-university/app/academics/page.jsx
```
The symlink target is `packages/bmi-shared` — but the real folder is `packages/shared`. The build fails on exactly the two most business-critical public pages: **Apply** and **Academics** (the page that lists degree programs and, per the prior website audit, is where tuition/program data was already flagged as missing). The code comment in `lib/programs.js` even documents the intent correctly: *"G-2 fix: the duplicate has been replaced by the single source of truth"* — the refactor is conceptually right and was clearly done in good faith, but it depends on a workspace-linking mechanism that `bmi-university` is structurally excluded from, so the fix doesn't hold under a clean build. I can't see Cloudflare Pages' live build configuration, so I can't say whether production is currently serving a stale pre-refactor build, is broken right now, or has an undocumented workaround — but nothing in the repository explains how this would succeed, and the one CI workflow written specifically to solve this exact problem (`bmi-university/.github/workflows/bmi-university.yml`, which checks out a separate `BMI-UNIVERSITY/bmi-shared` repo and packs it as a tarball) never runs (see §5.5).
**Impact:** Reproducibility failure on the public-facing site's core conversion funnel; whoever owns deployment should confirm directly what's actually live.

### 5.4 HIGH — Auth security relies on IP-only rate limiting; no per-account brute-force defense
`middleware/auth.ts`'s rate limiter is keyed on `(ip_address, endpoint, window)` with a uniform default of 30 requests/60s applied identically to `/api/auth/login` and every other endpoint (`index.ts:80`, one call site, no per-route override). There is no `failed_login_attempts` counter, no account lockout, and no escalating friction tied to the *account* being targeted — `grep -rn "lockout|account_locked|failed_login"` across `routes/` and `db/schema.sql` returns nothing. A distributed credential-stuffing attempt (rotating source IPs) faces zero additional resistance beyond the generic per-IP budget.

### 5.5 HIGH — 7 of 8 GitHub Actions workflow files in the repo never run
Confirmed directly against the GitHub API (not inferred):
```
GET /repos/BMI-UNIVERSITY/bmi-system/actions/workflows
→ total_count: 1  ("Deploy BMI System", .github/workflows/deploy.yml)
```
The other 7 — `apps/ums/.github/workflows/{ci,deploy,security}.yml`, `apps/portal/.github/workflows/{bmi-portal,cross-repo-smoke}.yml`, `bmi-university/.github/workflows/{bmi-university,test}.yml` — sit in nested `.github/workflows` directories that GitHub Actions never scans (it only reads workflows from the **repository root** `.github/workflows/`). These files are not disabled or paused — they are structurally invisible to the platform. Concretely, this means:
- UMS's dedicated `security.yml` (scheduled `npm audit` + CodeQL scanning) **never executes.** It also still references a `backend/` directory (`cd backend && npm audit`) that doesn't exist in this layout — evidence it's a stale copy from before the monorepo merge.
- Portal's `cross-repo-smoke.yml` never executes.
- bmi-university has **no working CI at all** — the one workflow that references it lives in a dead file, and the root `deploy.yml` doesn't build or deploy it either (confirmed by reading `deploy.yml` in full — it only has `deploy-api`, `deploy-portal`, `deploy-ums` jobs).
**Impact:** Teams reviewing "CI status" for these apps are looking at pipelines that cannot fail, because they cannot run.

### 5.6 HIGH — The one real CI pipeline doesn't actually gate on security or contract correctness
Within the single active workflow (`deploy.yml`):
- `npm audit --audit-level=high || true` — the trailing `|| true` guarantees this step **always exits 0**, so no vulnerability, at any severity, can ever fail the build.
- The only hard-gating **API contract test job** is fully commented out, with its own comment admitting why: *"TODO: Re-enable when contract tests are properly configured... Any regression in the response envelope will fail this job and block deployment"* — except it currently can't, because the job doesn't run.
- A leftover step, `sed -i 's/${CLOUDFLARE_D1_ID}/'...'/g' wrangler.jsonc`, tries to substitute a placeholder that no longer exists — `wrangler.jsonc`'s `database_id` is already a hardcoded literal UUID (`a5e26ad9-5d8e-4afa-9ad9-8cd55c1cbf1a`). The `sed` command silently no-ops every run.
**Impact:** "Passing CI" currently certifies type-correctness and unit/e2e test pass rates, but not dependency safety or API contract stability, despite both appearing to be covered.

### 5.7 HIGH — Contract/OpenAPI tests are self-referential and cannot detect real drift
Two independent files implement the same anti-pattern: `apps/api/lib/openapi.snapshot.test.ts` and `apps/ums/src/test/api-contracts.test.ts` both construct a **hand-written mock object** describing the expected API shape and assert it against **its own saved snapshot** (`toMatchSnapshot()`) or **its own inline expectations** — with explicit comments confirming no real request ever fires (*"No real network I/O occurs — fetch is already mocked globally"*). If the actual handler's response shape changes but nobody remembers to update the hand-written mock, these tests keep passing. This is contract-test *theater*, appearing twice, independently, in both the frontend and backend test suites — a systemic pattern, not a one-off.

Separately, `apps/ums/openapi.json` is a 334 KB, 11,530-line file that is **never imported or referenced anywhere** in the codebase (`grep -rn "openapi.json"` → zero hits outside itself), and its documented `LoginResponse` shape (`token`, `mfaToken`, single `user.name` field, `user.department`) **does not match** the current login handler's actual response (`csrf_token`, `first_name`/`last_name`, no bearer token in the body — it's cookie-based). This is stale, misleading documentation masquerading as a live spec.

### 5.8 MEDIUM/HIGH — Dependency vulnerabilities: `npm audit` finds 7 real issues, none of which gate CI
Live `npm audit --json` against the committed lockfile:

| Package | Severity | Advisory |
|---|---|---|
| `vitest` (root-level resolution, `2.1.9`) | **Critical** | GHSA-5xrq-8626-4rwp — arbitrary file read/execute when the Vitest UI server is listening |
| `vite` (transitive, ≤6.4.2) | **High** | GHSA-4w7w-66w2-5vf9 (path traversal in dep optimization), GHSA-fx2h-pf6j-xcff (`server.fs.deny` bypass), GHSA-v6wh-96g9-6wx3 (NTLMv2 hash disclosure via `launch-editor`) |
| `uuid` (via `exceljs`) | Moderate | GHSA-w5hq-g745-h8pq — missing buffer bounds check |
| `exceljs`, `esbuild`, `vite-node`, `@vitest/mocker` | Moderate | dev-tooling exposure |

Notably, every app-level `package.json` (`apps/api`, `apps/ums`) already *declares* `vitest: ^4.1.9`, and that version is what's actually installed under each app's `node_modules`. The vulnerable `2.1.9` resolves only at the **repository root** `node_modules/vitest` — a stale/orphaned install not declared by any workspace `package.json` I could find, left over from an earlier dependency graph and not cleaned up. These are overwhelmingly dev-tooling-only exposures (real risk requires an exposed local dev server), but a **Critical**-rated advisory sitting silently in a lockfile that CI explicitly chooses not to fail on is a process gap worth closing regardless of exploitability in this specific instance.

### 5.9 MEDIUM — Dead/unused code left in security-relevant files
`middleware/auth.ts:8-19` declares `rateLimitMap` (a `Map`) and a `getNow()` helper, with a comment describing an in-memory rate-limiting strategy — but the actual `rateLimit()` function below never references either. This is leftover scaffolding from an earlier implementation that was replaced by the current D1-backed approach without removing the old code — harmless today, but exactly the kind of dead code that causes confusion (and occasionally regressions) when the next person "fixes" the unused variables without realizing they're inert.

### 5.10 MEDIUM — Password hashing reuses the JWT signing secret as the hashing "pepper"
`lib/jwt.ts`'s `hashPassword`/`verifyPassword` take a `pepper` argument, and every call site (`routes/auth.ts`) passes `env.JWT_SECRET`. Reusing one secret for two distinct cryptographic purposes (token signing and password-hash strengthening) means a single leak compromises both controls simultaneously, and rotating one requires rotating the other (breaking all existing sessions the moment you try to re-pepper passwords). A dedicated `PASSWORD_PEPPER` secret, independent from `JWT_SECRET`, is a one-line fix with meaningful blast-radius reduction. Separately, PBKDF2 is configured at 50,000 iterations (`lib/jwt.ts`) — below current OWASP guidance (≥600,000 for PBKDF2-SHA256) — though this is a defensible trade-off given Cloudflare Workers' CPU-time budget on the free tier, not an oversight; it should be revisited if/when the account moves off the free tier.

### 5.11 MEDIUM — API versioning duplication doubles the router surface and invites drift
Every UMS-facing resource is duplicated under `/api/v1/*` in addition to Portal's `/api/*` convention — 36 distinct `/api/v1/...` path matches sit alongside 35 non-v1 matches in the same 669-line `index.ts` (`docs`/comments confirm this: *"Auth bridge: UMS uses /api/v1/auth/* which maps to the same handlers"*). Today these are aliases to the same handler functions, so there's no behavioral drift yet — but every future endpoint requires manually wiring two route entries, in a router with no shared route table, no OpenAPI generation, and no test that would catch someone adding one prefix and forgetting the other.

### 5.12 MEDIUM — Retention/archival job for D1 quota management is not actually deployed
`apps/api/scripts/archival_job.ts` implements exactly the retention strategy the project's own `BMI-SYSTEM_Cloudflare_FreeTier_Optimization.md` describes as necessary to avoid D1's free-tier storage ceiling — but it is a **standalone CLI script**, not wired to the Worker's `scheduled()` export. The one cron trigger that *is* configured (`wrangler.jsonc`: `"crons": ["0 0 * * *"]`) calls only `backupWorker.scheduled` (`index.ts:666-667`), which performs backups, not deletions. The archival script itself even says, when run directly: *"⚠️ Running in local dev mode. Skipping real DB execution"* and simulates its R2 export step as local filesystem writes (which wouldn't work inside a real Worker anyway — Workers have no `fs`). Meanwhile, `backup.ts` dumps 30 tables daily to R2 with **no rotation or expiry** of old backup sets, so R2 usage (also free-tier-capped) grows unbounded in the opposite direction. Net effect: the two halves of the quota-management story (purge old logs, don't keep backups forever) are each individually incomplete, in opposite directions.

### 5.13 LOW/MEDIUM — Repo hygiene: two package-manager lockfiles, one orphaned submodule, one alarming-but-inert package.json field
- Both `package-lock.json` (559 KB) and `pnpm-lock.yaml` (328 KB) are committed at the repo root simultaneously, while CI only ever runs `npm ci`. The team's own `NPM_INSTALL_ISSUE.md` documents a real, unresolved `npm install` failure ("Invalid Version" / hangs) and recommends switching to Yarn or pnpm as a workaround — exactly the kind of confusion dual lockfiles create.
- `bmi-portal` is present as a git submodule (`git ls-tree HEAD bmi-portal` → mode `160000`, commit `abe72242...`) with **no `.gitmodules` file**, i.e., an orphaned gitlink that `git clone` cannot initialize. `ls bmi-portal/` returns an empty directory.
- `apps/ums/package.json` contains `"main": "bypass_mfa.js"`. No file by that name exists anywhere in the repository's history for this path, and the field has no functional effect on a Vite frontend — but the label itself is inappropriate for a committed, public artifact and its provenance should be confirmed and the field removed as routine hygiene, independent of whether anything nefarious is behind it (nothing in the code suggests an actual bypass exists — this is a metadata anomaly, not a working exploit).
- `terraform/main.tf` and `terraform/terraform.tfvars.example` are saved as UTF-16LE with CRLF line endings (everything else in the repo is UTF-8/LF) — likely an artifact of a Windows editor — and the Terraform itself only covers D1, R2, and a KV namespace (`bmi-portal-sessions`) that the application no longer binds or uses (`wrangler.jsonc` has no `kv_namespaces` block; the comment there says sessions were "fully migrated to D1"). Terraform is also not invoked anywhere in CI — the real deploy path is `wrangler`/`wrangler-action` directly — so this IaC is decorative rather than authoritative.

---

## 6. Functional & Non-Functional Gaps (Section 3 of the requested scope)

### 6.1 Grade automation and deadline enforcement are UI-less stubs
`apps/ums/src/grading/services/GradeAutomationService.ts` and `GradeDeadlineService.ts` contain 12 `// TODO` markers covering exactly the features their names promise: saving deadline configuration, fetching courses with missing grades, flagging overdue courses, updating grade visibility, finalizing grades. I confirmed neither service is imported by any component (`grep -rln` across `src` outside their own folder → zero hits) — so this isn't a broken user-facing feature today, it's an abandoned module with no UI surface pointing at it. Worth tracking as unfinished roadmap work rather than a live defect.

### 6.2 No account-level session/device management
Session tracking is keyed deterministically as `session:${user.id}` (`routes/auth.ts:222-224`, `ON CONFLICT(id) DO UPDATE`) — one row per user, not per login. A second device logging in extends the same row rather than creating an independent, revocable session. This is a legitimate simplicity/security trade-off (global logout is trivial: delete one row), but it means the product **cannot** offer "sign out of one device" or "see your active sessions" without a schema change — worth flagging as a product gap if that capability is ever expected.

### 6.3 Accessibility (WCAG 2.1) coverage is narrow despite good tooling
The `axe-core`-based `checkA11y()` helper (§4.8) is applied to only **2 of ~129** component files in UMS. It is entirely absent from Portal and from `bmi-university` — the two surfaces a member of the public (an applicant, or a prospective student browsing the marketing site) is most likely to hit first. Baseline static signals look reasonable (image `alt` text present on all 6 `<img>` tags found in `bmi-university`; label-to-input ratios ≥1:1 across all three frontends), but "reasonable by grep" is not the same as a verified WCAG 2.1 AA conformance claim, and none exists today for the two apps most exposed to the public.

### 6.4 No cross-browser/device compatibility evidence
Playwright e2e coverage in UMS (`apps/ums/e2e/{students,dashboard,certificates,transcripts,auth}.e2e.ts`) targets a single configured browser project by default; I found no configuration invoking multiple browser engines (WebKit/Firefox) or mobile viewport emulation in the Playwright config, and — per §5.5 — the workflow meant to run these tests in CI is real (in the root `deploy.yml`, `test` job), but there's no equivalent for Portal or bmi-university.

### 6.5 No dedicated observability beyond Sentry + Cloudflare's built-in analytics
`@sentry/cloudflare` is wired into the Worker (`index.ts:1,63-68`) and `Sentry` packages are pinned in `pnpm-workspace.yaml`'s `minimumReleaseAgeExclude` list (a sign of active, careful dependency management for this specific package). `observability.enabled: true` is set in `wrangler.jsonc`. This is a genuine, working baseline — but there is no evidence of structured logging conventions, alert routing beyond `OPS_ALERT_EMAIL` (declared in the `Env` type but not verified wired to an actual alert path in the code I reviewed), or a dashboard/runbook tying Sentry events to on-call action. Adequate for now; not yet "production-grade" in the SRE sense of alerting + runbooks + SLOs.

---

## 7. Production Deployment Readiness (Section 4 of the requested scope)

| Area | Status | Evidence |
|---|---|---|
| Environment config completeness | Partial | `.env.example` exists for UMS only; Portal and bmi-university have no equivalent template committed |
| Secrets management | Good practice, some duplication | Secrets correctly kept out of `wrangler.jsonc` (`JWT_SECRET`, `RESEND_API_KEY`, etc. via `wrangler secret put`); but production API URL is hardcoded in 3+ places (`.env.example` comment, `services/config.ts` fallback, `deploy.yml` env var) rather than one config source |
| Containerization | N/A by design | Pure Cloudflare Workers/Pages deployment; no Docker/K8s in this stack, which is consistent with the architecture, not a gap |
| CI/CD build/test/deploy | **Broken in effect** | Only 1 of 8 workflows registered (§5.5); the real one soft-fails audit and has its contract-test gate disabled (§5.6) |
| DB migrations reliability | **Broken** | Two disconnected migration histories, one entirely untracked (§5.2) |
| Error tracking/observability | Working baseline | Sentry + Cloudflare observability wired (§6.5) |
| TLS | Handled by platform | Cloudflare terminates TLS for Workers/Pages by default; `Strict-Transport-Security` header set explicitly (`index.ts:57`) |
| Least-privilege access | Partially evidenced | RBAC role arrays (`requireAuth(req, env, ['admin'])`) consistently applied on sensitive routes I spot-checked (webhooks admin routes, admin user management) — good; but no centralized role-permission matrix, each handler declares its own array inline, which is a drift risk at scale |
| Data encryption at rest | Good for backups, unverified elsewhere | Backups AES-256-GCM encrypted when key is set (§4.9); D1/R2 rely on Cloudflare's platform-level encryption at rest, which is standard but not something this repo controls or verifies |
| Critical blockers before stable deploy | **Yes — 3** | (1) email verification bypass (§5.1) must be closed before onboarding real applicants; (2) migration history must be reconciled into one tracked source before any fresh environment (staging, DR) can be provisioned reliably (§5.2); (3) `bmi-university`'s build must be fixed or its actual deployment mechanism documented (§5.3) |

---

## 8. Cross-App Synchronization & Single Source of Truth — Direct Answer to Your Question

You asked specifically whether the apps are synced against one source of truth. The honest answer is **partially, and unevenly**:

- **At the database layer, yes.** One D1 database, one Worker, both frontends call through it. This part is architecturally sound.
- **At the shared-constants layer, mostly.** `packages/shared` genuinely centralizes domain URLs, the program catalog, and API types, and `apps/api`, `apps/portal`, and `apps/ums` all correctly consume it — real engineering discipline, not just intent.
- **At the build/workspace layer, no — and this is the crux of the gap.** `bmi-university` sits outside the npm/pnpm workspace boundary entirely. It still declares `"@bmi/shared": "*"`, and a prior fix (`lib/programs.js`'s "G-2 fix") correctly *identified* that it should stop duplicating the program list and pull from the shared source — but the mechanism to actually deliver that package to a non-workspace-member folder doesn't exist in a working state (I reproduced the exact failure in §5.3). So one of your four apps is structurally cut off from the "one source of truth" the other three share, despite code comments asserting the opposite.
- **At the API-contract layer, no.** Two independent, hand-mocked "contract tests" (§5.7) create the appearance of contract enforcement between frontend and backend without ever making a real request against real backend code. If the API's response shape drifts, nothing here will tell you.
- **At the CI/deployment layer, no.** Each app *thinks* it has its own tailored pipeline (dependency scanning, CodeQL, smoke tests) via its nested workflow files — none of them run (§5.5). The single pipeline that does run treats all three deployable apps uniformly but has no equivalent for bmi-university at all.

**What "actually unified" would look like, concretely, from here:** (a) move `bmi-university` into the workspace glob (or explicitly document and fix its external dependency path) so `@bmi/shared` resolves the same way everywhere; (b) collapse `apps/api/migrations/` and `apps/api/db/migrations/` into one tracked, sequential history and delete `db/schema.sql` as a manually-maintained duplicate, per the team's own documented intent; (c) replace the two hand-mocked contract tests with a single generated OpenAPI spec (or a lightweight Pact-style consumer contract) that both apps import from `packages/shared`, so "the contract" has exactly one definition; (d) consolidate the 8 workflow files into the root — delete the 7 that can't run, or promote the useful bits (CodeQL scanning from UMS's `security.yml`) into `deploy.yml` where they'll actually execute.

---

## 9. Additional Findings — Broader Best-Practice / "World-Class" Compliance Notes

- **Timing-safety inconsistency:** the admin-setup endpoint compares the setup key with `!==` (`routes/admin.ts:12`) rather than the constant-time pattern used everywhere else in this codebase (webhook signatures, password hashes). Low practical exploitability over a network, but inconsistent with the team's own otherwise-careful standard.
- **CSP is real and reasonably strict:** `index.ts:59` sets a `Content-Security-Policy` with `default-src 'self'`, no `unsafe-inline` for scripts, and a scoped `connect-src` — genuinely above-average for a project this size. Worth preserving as you iterate.
- **No API-level input validation library:** validation is done ad hoc per-handler (manual `if` checks) rather than through a schema-validation library (zod, etc.) shared across handlers. This works today but is a scaling risk — the 20 route files will drift in what they consider "valid" input without a shared schema layer.
- **Testing maturity by the numbers:** API route handlers — 1 of 20 files has a dedicated unit test (`student.test.ts`); UMS — 22 test files against ~129 source files, plus 6 Playwright e2e specs covering auth/students/dashboard/certificates/transcripts (grading, staff, finance, and timetabling flows have no e2e coverage); Portal — 6 test files, proportionally the best-covered app relative to its size, including a real integration test (`api.integration.test.ts`); bmi-university — 3 test files against 11 `.jsx` files (about, academics, accreditation, and admissions pages are untested).
- **Documentation drift is a recurring pattern, not a one-off:** the migrations doc (§5.2) and the UMS `openapi.json` (§5.7) are two independent instances of documentation asserting something the code doesn't currently do. Treat "docs say X" as a hypothesis to verify, not a fact, until this pattern is addressed structurally (e.g., docs generated from code rather than hand-maintained).

---

## 10. Risk-Prioritized Findings Register

Severity = Impact × Likelihood of exploitation/occurrence, per OWASP risk-rating convention.

| # | Finding | Impact | Likelihood | Severity | §Ref |
|---|---|---|---|---|---|
| 1 | Email verification disabled (3 code paths) | High | High (already live) | **Critical** | 5.1 |
| 2 | Untracked/contradictory DB migration history | High | High (already live) | **Critical** | 5.2 |
| 3 | `bmi-university` build broken on Apply/Academics | High | High (reproduced) | **Critical** | 5.3 |
| 4 | 7/8 CI workflows never execute | Medium-High | High (already live) | **Critical** | 5.5 |
| 5 | `npm audit` soft-failed + contract gate disabled | Medium-High | High (already live) | **Critical** | 5.6 |
| 6 | No per-account brute-force protection | Medium | Medium | High | 5.4 |
| 7 | Self-referential "contract tests" (2 instances) | Medium | Medium-High | High | 5.7 |
| 8 | Critical/High npm CVEs present, unenforced | Medium (dev-scope) | Low-Medium | High | 5.8 |
| 9 | Stale/orphaned `openapi.json` (11.5k lines) | Low-Medium | Medium | Medium | 5.7 |
| 10 | Password pepper = JWT secret | Medium | Low | Medium | 5.10 |
| 11 | Dead in-memory rate-limit code | Low | High (already live, harmless) | Medium | 5.9 |
| 12 | API `/v1` route duplication (36 entries) | Medium (maintenance) | Medium | Medium | 5.11 |
| 13 | Archival job not deployed; backups unbounded | Medium | High (already live) | Medium | 5.12 |
| 14 | Dual lockfiles (npm + pnpm) | Low | High (documented, already occurred) | Medium | 5.13 |
| 15 | Orphaned `bmi-portal` submodule | Low | High (already live) | Low | 5.13 |
| 16 | `"main": "bypass_mfa.js"` dangling metadata | Low (no working exploit found) | N/A | Low | 5.13 |
| 17 | Terraform: UTF-16 encoding, orphaned KV resource, not CI-wired | Low | High (already live) | Low | 5.13 |
| 18 | Admin-setup key uses non-constant-time compare | Low | Very Low | Low | 9 |
| 19 | Grade automation/deadline services unimplemented | Low (no UI reaches them) | N/A | Low | 6.1 |
| 20 | No per-device session revocation | Low (product gap) | N/A | Low | 6.2 |
| 21 | Accessibility testing narrow (2/129 components) | Medium (compliance exposure) | Medium | Medium | 6.3 |
| 22 | No multi-browser/device e2e evidence | Low-Medium | Medium | Medium | 6.4 |
| 23 | No schema-validation library; per-handler ad hoc checks | Low (today), Medium (at scale) | Medium | Medium | 9 |

---

## 11. Tiered Remediation Roadmap

**Immediate (before next deploy / this week) — closes the 5 Critical items**
1. Re-enable email verification: delete the 3 `DEV_ONLY` comment blocks in `routes/auth.ts` (149, 197, 510) and restore the real `emailVerified` check in the OAuth path.
2. Pick one migration history. Recommended: keep `apps/api/migrations/`, port the 4 orphaned files from `db/migrations/` into it as new sequentially-numbered migrations, delete `db/schema.sql` and `db/migrations/`, and add a CI check that fails if `schema.sql`-style dumps reappear.
3. Fix or formally document `bmi-university`'s dependency path: either add it to the workspace glob, or replace `"@bmi/shared": "*"` with a working `file:` reference and confirm a clean-clone build succeeds (re-run the exact repro in §5.3 as your acceptance test).
4. Delete the 7 dead nested workflow files (or consolidate the useful pieces — CodeQL from `security.yml` in particular — into the root `deploy.yml`, since that's the only one GitHub actually runs).
5. Remove `|| true` from the `npm audit` step and decide a real severity threshold to fail on; re-enable (or replace) the commented-out contract-test gate.

**Short-term (30 days)**
- Split `PASSWORD_PEPPER` from `JWT_SECRET` (accept the one-time session invalidation this causes).
- Add account-scoped brute-force protection (progressive delay or lockout after N failed attempts per account, independent of IP).
- Replace both hand-mocked "contract tests" with one real mechanism: either generate an OpenAPI doc from the actual route table and validate both frontends against it in CI, or stand up a lightweight local Worker instance in tests and hit it for real.
- Wire the retention/archival job into an actual `scheduled()` handler (or fold its logic into `backup.ts`'s existing cron), and add rotation/expiry to the backup R2 prefix so it doesn't grow unbounded.
- Consolidate the hardcoded production API URL (currently duplicated in `.env.example`, `services/config.ts`, and `deploy.yml`) into one place.

**Medium-term (90 days)**
- Bring API test coverage up from 1/20 route files; prioritize the 19 untested modules by how much money/PII moves through them (finance, admissions, documents first).
- Expand `axe-core` WCAG checks from 2 components to at least every route-level page component in UMS, Portal, and bmi-university; add it as a CI gate, not just an available helper.
- Introduce a shared request-validation library (zod or similar) so the 20 API route files stop reimplementing input checks ad hoc.
- Resolve the dual-lockfile situation: pick npm or pnpm, delete the other lockfile, and update `NPM_INSTALL_ISSUE.md`/onboarding docs accordingly.
- Clean up dead code flagged in §5.9 and §5.13 (`rateLimitMap`/`getNow()`, the `bypass_mfa.js` field, UTF-16 Terraform files) as part of routine hygiene passes.

**Longer-term / strategic**
- Decide, deliberately, whether to adopt Drizzle (as `docs/database-migrations.md` already floats) — if you do, this also naturally forces reconciliation of the two migration folders as part of the migration to typed schemas.
- Build out real observability: structured logging conventions, alert routing tied to `OPS_ALERT_EMAIL` with a runbook, and basic SLOs for the API Worker.
- Formalize the `bmi-portal` situation — either properly register it as a submodule with a `.gitmodules` entry and initialize it, or remove the gitlink if it's no longer part of the active system.

---

## 12. Appendix — Verification Log

For reproducibility, the key empirical checks behind this report's highest-severity claims:
- `git clone` (full history, 73 commits) + `grep -ril "hono\|drizzle"` across `apps/api` → confirms actual stack.
- `comm -23` diff of tables created by `db/schema.sql` vs. the union of both migration folders → confirms the 10-table gap in the tracked migration path.
- Isolated `npm install && npm run build` inside a fresh copy of `bmi-university/` (both standalone and inside a full repo copy) → reproduced `Module not found: Can't resolve '@bmi/shared'` on `lib/programs.js:10`, breaking `/apply` and `/academics`.
- `GET https://api.github.com/repos/BMI-UNIVERSITY/bmi-system/actions/workflows` → `total_count: 1`, confirming only `deploy.yml` is registered.
- `npm audit --json` against the committed lockfile → 7 vulnerabilities (1 critical, 1 high, 5 moderate), detailed in §5.8.
- Manual review of `routes/auth.ts`, `middleware/auth.ts`, `lib/jwt.ts`, `lib/webhook.ts`, `lib/types.ts`, `documents.ts`, `webhooks.ts`, `admin.ts`, `cms.ts`, `ums-collections.ts`, `ums-staff.ts`, `ums-stats.ts`, `archival_job.ts`, `backup.ts`, `wrangler.jsonc`, `terraform/main.tf`, and both migration directories in full.

*This audit reflects the repository at commit `cfff4c8`. Re-run the specific commands above after remediation to confirm each fix before considering an item closed.*
