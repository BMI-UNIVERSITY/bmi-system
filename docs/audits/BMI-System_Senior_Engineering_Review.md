# BMI System — Senior Engineering & Security Review

**Repository:** `bmi-system-main` (BMI University monorepo)
**Reviewed:** July 2026 | **Scope:** Full monorepo (apps/api, apps/portal, apps/ums, bmi-university, packages/shared, infra)
**Reviewer stance:** External senior engineer / security consultant reading the code cold, not the design docs

---

## 1. Executive Summary

This is a genuinely well-architected serverless system — a single Cloudflare Worker API (D1 + R2 + Sentry), backing three Cloudflare Pages frontends, with real CI/CD gates, contract tests, and thoughtful client-side security choices (JWT in httpOnly cookies, CSRF token kept in memory, not localStorage). The password/session primitives are hand-rolled correctly using WebCrypto rather than a shortcut like plain SHA-256.

That said, the review surfaced **two Critical broken-access-control bugs** in the UMS student/grades endpoints that let any authenticated student read *any other student's* profile and *the entire university's* grade records — the kind of bug that automated route-level tests would have caught, and the kind that matters most given this is student PII and academic records. There's also a live authentication bypass sitting in commented-out code (email verification is not actually enforced at login, despite registration implying it is). Test coverage on the API is thin (4 test files for ~25 route modules), which is very likely *why* the IDOR bugs weren't caught.

None of this requires a rewrite. It's a focused remediation pass (roughly 1–2 weeks) on a fundamentally sound codebase.

**Overall grade: B- (solid architecture and frontend security hygiene, let down by inconsistent authorization enforcement and thin backend test coverage).**

---

## 2. Repository Structure

```
bmi-system-main/
├── apps/
│   ├── api/          Cloudflare Worker — unified backend (Hono-less hand-rolled router)
│   ├── portal/        React 19 + Vite — public admissions portal
│   └── ums/            React 19 + Vite — internal University Management System
├── bmi-university/    Next.js 16 marketing site (separate deploy, own CI)
├── packages/shared/    @bmi/shared — cross-app types/constants
├── terraform/          Minimal Cloudflare IaC (D1 + R2 only, 52 lines)
├── docs/                2 files (api-conventions.md, database-migrations.md)
├── .kiro/specs/         AI-assistant task specs (dev tooling artifact, not app code)
├── bmi-portal/          Empty directory — dead leftover
└── 9 root-level *.md audit/report files (see §11)
```

**Findings:**
- **Monorepo hygiene:** workspace-based (`npm` workspaces), reasonably clean separation of concerns between the 4 deployable units.
- **Dual lockfiles:** both `package-lock.json` (649 KB) and `pnpm-lock.yaml` (313 KB) are committed at the root, with a `pnpm-workspace.yaml` also present. CI (`deploy.yml`) exclusively uses `npm ci`. Two competing lockfiles for the same dependency tree is a real hazard — anyone who runs `pnpm install` locally will get a dependency graph CI never validates. **Recommendation:** pick one package manager and delete the other lockfile + config.
- **Dead directory:** `bmi-portal/` is empty — remnant of an earlier restructuring. Harmless but should be removed.
- **Terraform is decorative, not authoritative:** it declares the D1 database and R2 buckets only — no Workers, Pages projects, secrets, or DNS. Actual provisioning happens by hand via `wrangler` commands in the README. This means the infra is not reproducible from source control; if the Cloudflare account were lost, rebuilding would rely on tribal knowledge, not `terraform apply`.

---

## 3. Architecture Assessment

**Pattern:** Single unified Cloudflare Worker (`apps/api`) fronting D1 (SQLite-based relational DB), R2 (object storage for documents), and three separate static/SPA frontends deployed to Cloudflare Pages. Auth is a single shared JWT cookie (`bmi_token`) trusted across `portal` and `ums` via CORS + shared cookie domain.

**Strengths:**
- **Single source of truth for auth/data** — one D1 database, one JWT issuer, avoids the classic multi-service auth-drift problem.
- **Edge-native design** fits the stated goal (Cloudflare free-tier, low-traffic university system) well — no idle servers, pay-per-request.
- **Clear tier separation**: public marketing site is fully decoupled (separate Next.js deploy) from the transactional apps, so a marketing content update can't take down enrollment/grades.
- **Sensible defaults**: security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) applied uniformly via `withCors()` wrapper in `index.ts` rather than duplicated per-route.

**Weaknesses:**
- **The router is a 669-line if/else chain** (`apps/api/index.ts`) matching path/method combinations with regex. This works at the current route count (~80 routes) but is already showing strain: some routes (rubrics, timetabling) end with inconsistent brace/indentation styles (visible switch from 2-space to non-indented blocks around line ~275 and ~525), and the auth-role for each route is easy to get wrong by copy-paste (see §5, the timetabling POST bug). A declarative route table (`{ method, path, roles, handler }[]`) or a micro-router (itty-router, Hono) would remove an entire class of "forgot to add role check" bugs and cut the file by ~40%.
- **Two ID schemes for students** (`user_id` and `reg_no`) are accepted interchangeably almost everywhere (`WHERE s.user_id = ? OR s.reg_no = ?`). Convenient for the UI, but it means every handler that takes an ID has to remember to do this OR, and it doubles the parameter-binding surface for a query that could be answered with a single canonical ID. Consider normalizing to `user_id` internally and resolving `reg_no → user_id` once at the edge.
- **Session model is one-row-per-user, not one-row-per-device** (`sessions.id = 'session:' + user_id`, upserted on every login). Logging in on a phone silently extends/overwrites the desktop session's row; logging out on one device kills sessions everywhere. This may be intentional simplicity, but it's worth confirming it's a product decision and not an oversight, since it also means there's no way to show a user "your active sessions" or revoke one device without revoking all.
- **`/api/v1/auth/refresh` maps to `handleLogin`** (comment: *"Handled by re-auth"*), but `handleLogin` expects `{email, password}` in the JSON body while the actual refresh flow (`handleRefresh`, used elsewhere) reads the JWT from the cookie. The UMS frontend's refresh call will 400 unless it's also sending stored credentials, which the cookie-only design says it shouldn't have. This looks like a copy-paste placeholder that was never wired to `handleRefresh`. **Worth verifying end-to-end.**

---

## 4. Code Quality Score

| Area | Score (1–10) | Notes |
|---|---|---|
| API backend (`apps/api`) | 6.5 | Clean helper functions, consistent parameterized SQL, but a monolithic router and inconsistent authorization pattern (see §5) |
| UMS frontend (`apps/ums`) | 7.5 | Has lint, type-check, unit + E2E tests, husky pre-commit hooks — most mature part of the repo |
| Portal frontend (`apps/portal`) | 7 | Good security-conscious auth hook design (tested localStorage exclusion), smaller surface |
| Marketing site (`bmi-university`) | 6.5 | Standard Next.js app, minimal test coverage (3 test files) |
| Shared package | 7 | Small, focused, has typecheck + test |

**Overall: ~6.8/10.** The code itself (naming, function size, SQL parameterization discipline, error handling shape) is above-average for a solo/small-team project. The deductions are almost entirely about *consistency* (the same security pattern applied in some handlers and not others) rather than raw code quality.

---

## 5. Security Assessment

This is the section that matters most given the data involved (student PII, grades, financial records). Findings are prioritized in §13; details here.

### 5.1 Critical — Broken Object-Level Authorization (IDOR) on student & grade records

`GET /api/v1/students/:id` is registered with `requireAuth(request, env, ['admin','staff','student'])` — i.e. any logged-in student can call it. But `handleGetStudent()` never compares the requested `:id` against the caller's own `sub`:

```ts
// apps/api/routes/ums-students.ts
export async function handleGetStudent(request: Request, env: Env, studentId: string) {
  const row = await env.DB.prepare(
    `SELECT s.user_id as id, s.*, u.email, u.first_name, u.last_name, u.phone, u.role
     FROM students s INNER JOIN users u ON s.user_id = u.id
     WHERE s.user_id = ? OR s.reg_no = ?`
  ).bind(studentId, studentId).first();
  ...
}
```

Any authenticated student can enumerate `reg_no` values (they're sequential/predictable per the `reg_number.ts` generator) or simply try other UUIDs and read another student's full profile: DOB, nationality, GPA, phone, admission date, campus.

The same pattern exists in `GET /api/v1/grades` (`handleListGrades`), which is also reachable by role `student`. It accepts an optional `studentId` query parameter but **never validates it against the caller**, and if the parameter is omitted entirely, it returns a paginated list of *every* enrolled student's grades, joined with names and registration numbers:

```ts
// apps/api/routes/ums-grades.ts — no ownership check, no default scoping to caller
export async function handleListGrades(request: Request, env: Env) { ... }
```

**Impact:** any student account (the lowest-privilege authenticated role in the system) can read the academic and personal records of the entire student body. This is the highest-severity finding in the review.

**Fix:** in `index.ts`, when `auth.user.role === 'student'`, either (a) force the `studentId`/`:id` param to `auth.user.sub` before calling the handler, ignoring what the client sent, or (b) pass `auth.user.sub` and `auth.user.role` into the handlers (as is already done correctly in `documents.ts` and `apply.ts`'s lifecycle handler — see below) and have the handler enforce `if (role === 'student' && targetId !== callerId) return error(403)`. The codebase already has the right pattern elsewhere; it just needs to be applied here.

Contrast with the **correct** implementation in `routes/documents.ts`:
```ts
const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';
if (!isAdminOrStaff && doc.user_id !== userId) { return error('Forbidden', 403); }
```
and in `apply.ts`'s `handleGetLifecycle`, which is called with `auth.user.sub, auth.user.role` and presumably checks ownership the same way. This confirms the team knows the correct pattern — it just wasn't applied uniformly to the newer UMS routes.

### 5.2 High — Missing role restriction on timetabling writes

```ts
} else if (path === '/api/v1/timetabling' && method === 'POST') {
  const auth = await requireAuth(request, env);   // <-- no role array
  if (auth instanceof Response) return withCors(auth, request, env);
  response = await handleCreateTimetabling(request, env);
```

Compare to the otherwise-identical rubrics route two dozen lines away, which correctly restricts POST to `['admin','staff']`. As written, any authenticated user — including a student — can create timetabling entries. This looks like a straightforward copy-paste omission, not a deliberate choice, and is exactly the kind of bug a declarative route table (§3) would prevent by forcing every route to declare its roles explicitly.

### 5.3 High — Email verification bypass is live in production code (commented-out enforcement)

`handleLogin()` contains:
```ts
// DEV_ONLY: skip email verification check (uncomment to reinstate)
// if (!user.is_verified) {
//   return error('Please verify your email address before logging in...', 403);
// }
```
Registration creates an unverified account and sends a verification email, clearly implying verification is a security/product control — but login never checks it. Any email address (including ones you don't own, since nothing confirms receipt) can currently be used to fully authenticate. Similarly, `handleResendVerification()`'s entire body is commented out, so the "resend verification" endpoint is a no-op that always claims success.

If this was disabled intentionally for a demo/staging period, it needs a tracked ticket and an expiry — "DEV_ONLY" comments with no owner or date are exactly how bypasses become permanent. **This should be re-enabled before any production launch that relies on verified-email as an identity signal** (e.g., for password reset, official communications, or admissions correspondence).

### 5.4 Medium — Password hashing pepper reuses the JWT signing secret

`hashPassword(password, env.JWT_SECRET)` uses the same `JWT_SECRET` both to sign session tokens *and* as the HMAC pepper for password hashing. These should be independent secrets (`JWT_SECRET` and a separate `PASSWORD_PEPPER`). If the JWT secret is ever rotated (e.g., after a suspected leak), every stored password hash silently becomes unverifiable against future logins using the old creation-time pepper — and conversely, a single secret compromise now threatens both token forgery *and* offline password-cracking resistance simultaneously, rather than just one.

### 5.5 Medium — PBKDF2 iteration count is below current guidance

`iterations: 50000` for PBKDF2-HMAC-SHA256. OWASP's current guidance (2023+) recommends 600,000 iterations for PBKDF2-SHA256, with 210,000 as an older/minimum baseline. 50,000 is meaningfully weaker against offline brute-force if the DB is ever exfiltrated. Cloudflare Workers have a CPU-time budget per request, which likely motivated the low count — worth checking how much headroom exists (bumping to at least 210,000 and load-testing login latency is a reasonable target).

### 5.6 Low/Medium — Miscellaneous

- **Non-constant-time comparisons** for CSRF token (`csrfCookie === csrfHeader`) and admin setup key (`setupKey !== env.ADMIN_SETUP_KEY`) in `lib/types.ts` / `routes/admin.ts`. The password-hash comparison correctly uses a constant-time XOR loop — the same care should extend to these two, even though CSRF/setup-key timing attacks are lower practical risk over the network than password timing attacks.
- **OAuth `access_token` stored in plaintext** in `oauth_accounts` table. If it's not used for anything beyond initial identity lookup, consider not persisting it at all; if it is reused, encrypt at rest.
- **`dangerouslySetInnerHTML`** in `apps/portal/src/pages/Login.tsx` renders a server-derived error string as raw HTML (currently gated behind a fixed string match, and currently unreachable dead code per §5.3). Low risk today, but it's a footgun for the next person who adds a new error branch — rendering a link via JSX conditionally instead of string-concatenated HTML removes the risk class entirely.
- **CORS allowlist contains one-off preview deployment hashes** (`https://8b1de1e8.bmi-portal-7oo.pages.dev`) baked permanently into `wrangler.jsonc`. These accumulate over time and should be pruned periodically; they're low risk (an attacker would need control of that exact ephemeral preview subdomain) but are effectively dead trust grants.
- **Cloudflare `account_id` and D1 `database_id` are committed in `wrangler.jsonc`.** These aren't secrets by themselves (they don't grant access without the API token), but committing real production resource identifiers to a public-facing repo is generally avoided as a matter of least-disclosure; consider whether this repo is/will be public.

### 5.7 What's done well (worth preserving, not just criticizing)

- Passwords: PBKDF2 + per-password random salt + HMAC pepper, constant-time verification, common-password blocklist, and a real strength policy — this is a correct, not a naive, implementation.
- JWTs are HMAC-signed via WebCrypto (not a home-grown signature scheme), stored **only** in an `HttpOnly; Secure` cookie — never exposed to JS.
- CSRF is handled with a double-submit token pattern, validated on all state-changing methods except a deliberately-scoped exemption list.
- Rate limiting is **persisted in D1** (not per-isolate memory, which would be trivially bypassed by hitting a different edge location) — a detail many teams get wrong on Workers.
- Frontend explicitly avoids putting the JWT or CSRF token in `localStorage`, and there are dedicated tests (`api.test.ts`, `api.integration.test.ts`) asserting this stays true — real defense-in-depth against XSS token theft, with a regression guard.
- SQL is parameterized everywhere reviewed; the only dynamic-SQL-fragment patterns found build column names from fixed server-side allowlists, not user input — no SQL injection found.
- Full security header suite (CSP, HSTS, X-Frame-Options, Permissions-Policy) applied centrally.

---

## 6. Performance Analysis

- **Rate limiting writes to D1 on every single request** (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`), plus a 5% chance of an additional `DELETE` for eviction. On Cloudflare's free/low tier, D1 write latency and quota are the more likely bottleneck than Worker CPU. This is a reasonable trade-off for correctness (see §5.7) but worth monitoring under load — a KV-based approximate counter (accepting some imprecision) would reduce D1 write volume substantially if this becomes a cost/latency issue.
- **`handleListGrades` computes letter grades and GPA in application code, per row, on every request** rather than storing/deriving once — fine at current scale (a few hundred students), but will show up in profiling if enrollment grows an order of magnitude, especially combined with the N-table join (`grades → enrollments → courses → students → users`).
- **No caching layer** (e.g., Cache API, KV) in front of clearly-cacheable public endpoints (`/api/public/programs`, `/api/public/stats`, CMS posts/pages) — these hit D1 on every request even though the underlying content changes infrequently. Low effort, real win: cache these at the edge with a short TTL.
- Frontend bundles use current-generation tooling (Vite 8, Next 16) with no evidence of obvious bloat (no bundle-analyzer output reviewed, but dependency lists are lean — 22 deps for the largest frontend).

---

## 7. Scalability Review

- **D1 is SQLite-based** — great for a single-campus/multi-campus university at hundreds-to-low-thousands of concurrent users, but it has real ceilings (a single writer per database, storage limits) that this architecture will hit well before a Postgres-backed service would. For BMI University's stated scale (a few campuses, not a national system), this is an appropriate choice, not a red flag — but it should be a documented, revisited-annually decision, not an implicit one.
- **The unified single Worker for all apps** (portal + UMS + admin + CMS + webhooks) means a bug or a burst of expensive queries in one feature (e.g., a slow report endpoint) shares the same request queue/CPU budget as login and enrollment. At current scale this is fine and arguably simpler to operate; if the university adds heavier workloads (e.g., bulk transcript generation, large CSV imports), consider splitting those into a separate Worker or a queue-backed background job (Cloudflare Queues) rather than growing the monolith's synchronous request path.
- **Session table grows with users, not with logins** (one row per user, upserted) — this actually scales *well* since it doesn't accumulate stale rows the way a naive session-per-login table would without cleanup.
- **Multi-campus support exists in schema** (`study_center_id` filters throughout), which is good forward design for BMI's stated Mukurweini/Giathugu multi-campus reality.

---

## 8. Maintainability Score: **6.5/10**

**Positives:**
- Consistent file naming and route-module boundaries (`ums-students.ts`, `ums-grades.ts`, etc.) make it easy to find where a given resource lives.
- `packages/shared` centralizing cross-app types/CORS origins avoids the classic "three copies of the same constant" monorepo failure mode.
- UMS has husky pre-commit hooks, lint, type-check, and E2E — the most maintainable corner of the repo, and a template the other apps should be brought up to.

**Negatives (the actual cost centers going forward):**
- The 669-line router in `index.ts` is the single biggest maintainability risk — every new route requires remembering to add auth, add the correct role array, and add CSRF exemption if needed, by hand, by example. This is precisely the mechanism that produced the §5.2 bug.
- **Inconsistent authorization pattern** (some handlers self-check ownership, some rely entirely on the route's role array, some do neither) means a new contributor can't safely infer "is this endpoint safe?" from looking at one file — they have to trace router → middleware → handler every time.
- **No lint script exists for `apps/api`** at all (`package.json` has no `lint` entry), and CI runs no lint step for any package even where scripts exist (ums, bmi-university, portal all have `lint` scripts that CI never calls). Type-checking is enforced; style/correctness linting is not.
- **Root-level document clutter** — 9 markdown reports/audits sitting at the repo root (`FIXES_APPLIED.md`, `NPM_INSTALL_ISSUE.md`, `BMI-SYSTEM_Comprehensive_Audit.md`, etc., ~2,000 lines combined) mixed in with the actual `README.md`. These read as valuable historical context but belong in `docs/` or `docs/audits/`, not the repo root, where they crowd out the one file (README) a new contributor actually needs first.

---

## 9. Technical Debt Analysis

| Item | Est. effort to fix | Risk if left |
|---|---|---|
| IDOR on students/grades (§5.1) | 0.5–1 day | Critical — active data exposure |
| Timetabling role-check gap (§5.2) | 15 min | High — unauthorized writes |
| Commented-out email verification (§5.3) | 1–2 hrs (re-enable + test) | High — auth bypass |
| Router → declarative route table refactor (§3, §8) | 2–3 days | Medium — compounds every sprint as routes grow |
| Dual lockfiles (§2) | 30 min | Medium — silent dependency drift |
| API test coverage (4 files / ~25 route modules) | Ongoing, 1–2 wks for meaningful coverage | High — this is *why* §5.1/§5.2 shipped |
| Pepper/JWT secret reuse (§5.4) | 1 hr + secret rotation plan | Medium |
| PBKDF2 iteration count (§5.5) | 1 hr + latency check | Medium |
| No CI lint gate (§8) | 30 min | Low/Medium — style drift, missed correctness lints |
| Root-level doc clutter (§8, §11) | 30 min | Low — onboarding friction only |
| Terraform not authoritative (§2) | 1–2 days to expand | Low at current scale, medium if the account is ever handed to someone new |

**Total estimated remediation: ~2–3 weeks of focused work**, most of it front-loaded in the first three rows (which should happen before the next production deploy).

---

## 10. Dependency Review

- **Frameworks are current-generation, not legacy debt:** React 19.2, Next.js 16.2, Vite 8, TypeScript 5.8/6.0, Tailwind 4, Zustand 5, TanStack Query 5, Wrangler 4.104. No evidence of the "stuck on React 17 / Next 12" pattern that usually dominates this section of a review — genuinely well-maintained.
- **`@sentry/cloudflare` for error monitoring** is wired into the Worker entrypoint (`withSentry`) — good observability instinct for a serverless backend where you can't just `tail -f` a log file.
- **No automated dependency vulnerability scanning** in CI (no `npm audit`, no Dependabot/Renovate config, no GitHub CodeQL workflow found). Given the frameworks are current, immediate risk is low, but this is the kind of gap that quietly turns into a Critical finding six months from now when a transitive dependency gets a CVE. **Recommend:** enable Dependabot (near-zero effort, GitHub-native) at minimum.
- **`pnpm-workspace.yaml` contains a `minimumReleaseAgeExclude` allowlist for several `@sentry/*` packages** — this is a pnpm supply-chain-protection feature (delaying adoption of just-published packages by default, unless allowlisted) that suggests some supply-chain awareness already exists in the tooling config, even though it's presently pointed at the unused pnpm lockfile.
- **`resolutions`/`overrides` pinning `uuid` to `^11.1.1`** in both `package.json` and `pnpm-workspace.yaml` — sensible use of a forced resolution to avoid a dependency-tree version conflict.

---

## 11. Documentation Review

- **`docs/`** contains exactly two focused files (`api-conventions.md`, `database-migrations.md`) — good in spirit (living technical docs), but thin relative to the system's actual surface area (no documented API reference/OpenAPI spec is *published*, despite there being an `openapi.snapshot.test.ts` internally — that snapshot could plausibly be exported into an actual docs artifact with little extra work).
- **README is solid**: clear architecture diagram, clear "single source of truth" table, clear local-dev and deploy instructions, clear list of required GitHub secrets.
- **Root-level audit/report sprawl** (9 files, ~2,000 lines) — `BMI-SYSTEM_Comprehensive_Audit.md`, `CODEBASE_SYNC_COMPLETION_REPORT.md`, `FIXES_APPLIED.md`, `NPM_INSTALL_ISSUE.md`, `INSTALL_GUIDE.md`, `BMI-System-SIS-Production-Wiring-Plan.md`, `BMI-SYSTEM_Cloudflare_FreeTier_Optimization.md`, `BMI-University-Website-Audit.md`. Individually useful (they show real engineering diligence — an install-troubleshooting doc and a prior comprehensive audit both indicate a team that documents its own fixes), but collectively they clutter the root directory and will drift out of date. **Recommend** consolidating into `docs/history/` or `docs/audits/`, keeping only `README.md`, `INSTALL_GUIDE.md`, and one current architecture doc at the root.
- No CONTRIBUTING.md or PR template found (a `.github/ISSUE_TEMPLATE` exists under `bmi-university/` only, not at the monorepo root).

---

## 12. Testing Quality

| App | Test files | Rough source files | Coverage signal |
|---|---|---|---|
| `apps/api` | 4 (`jwt.test.ts`, `jwt.contract.test.ts`, `openapi.snapshot.test.ts`, `student.test.ts`) | ~41 | **Thin** — one route module (`student.ts`) has a test; the other ~24 route modules (auth, admin, documents, all UMS collections, CMS, webhooks, recommendations, programs) have none |
| `apps/ums` | 22 (unit + Playwright E2E) | ~129 | **Reasonable** — includes E2E, coverage script exists (`test:coverage`) |
| `apps/portal` | 6, including a dedicated `api.integration.test.ts` asserting security properties (no token in localStorage) | ~31 | **Good for what it covers** — small but high-value, security-property tests are the right instinct |
| `bmi-university` | 3 | — | Light, acceptable for a mostly-static marketing site |

**The API's test gap is the standout issue.** It's also the highest-stakes app (auth, PII, grades, finance), and it's the one with a "hard gate" contract-test job in CI (`contract-tests`) — but that gate only checks the response *envelope shape* (`{success, data:{items,page,perPage,total}}`), not authorization behavior. A contract test suite that verifies "the envelope looks right" without verifying "the right person can/can't see this data" gives false confidence — CI was green while the IDOR bugs in §5.1 shipped.

**Concrete recommendation:** for every route in `index.ts` that takes a role array, add one test asserting the *disallowed* roles get 403/404, and for every route where a `student` role can pass an ID, add a test asserting a student cannot fetch another student's ID. This single pattern, applied mechanically across the ~15 UMS routes, would have caught both Critical/High findings in this review.

---

## 13. CI/CD Evaluation

**Good:**
- Path-based filtering (`dorny/paths-filter`) so a portal-only change doesn't redeploy the API — sensible for a 4-service monorepo.
- Deploys are gated on `[changes, test, contract-tests]` — nothing ships without type-check + test + contract-test passing first.
- Contract tests are explicitly called out as a "hard gate, not continue-on-error" in a code comment — good intent, though see §12 on what the gate actually checks.
- D1 migration verification (`verify-migrations`) runs in CI before deploy — a good habit that prevents "works locally, breaks prod schema" surprises.
- Separate `cross-repo-smoke.yml` in `apps/portal` suggests some cross-service smoke testing exists beyond the main pipeline.

**Gaps:**
- **No lint step anywhere in `deploy.yml`**, despite `ums`, `portal`, and `bmi-university` all defining `lint` scripts. Only type-checking runs. Add `npm run lint` alongside the existing type-check steps — this is close to free given the scripts already exist.
- **No dependency/secret vulnerability scanning** (no `npm audit`, Dependabot, or CodeQL workflow found anywhere in the repo).
- **No staging environment / preview-deploy gate visible** — pushes to `main` go straight to production Workers/Pages once tests pass. For a system holding student PII, a manual-approval step (GitHub Environments with required reviewers) before the `deploy-api` job would add a meaningful safety net for exactly the kind of authorization regression found in this review.
- Secrets injection via `sed -i` string replacement into `wrangler.jsonc` (for `CLOUDFLARE_D1_ID`) works but is fragile — a `wrangler.jsonc` template + `envsubst`, or Wrangler's native environment-variable interpolation, would be more robust to formatting changes.

---

## 14. Prioritized Findings

### 🔴 Critical
1. **IDOR: any student can read any other student's full profile** — `GET /api/v1/students/:id` doesn't verify caller owns the record (§5.1).
2. **IDOR: any student can list the entire student body's grades** — `GET /api/v1/grades` has no default/enforced scoping to the caller (§5.1).

### 🟠 High
3. **Missing role restriction on `POST /api/v1/timetabling`** — any authenticated user, including students, can create timetabling entries (§5.2).
4. **Email verification is not enforced at login** — the check exists in registration but is commented out in `handleLogin`; unverified/unowned emails can fully authenticate (§5.3).
5. **API test coverage gap** — 4 test files cover ~25 route modules; the two Critical findings above are exactly what targeted route tests would catch (§12).

### 🟡 Medium
6. **Password pepper reuses `JWT_SECRET`** — should be an independently-rotatable secret (§5.4).
7. **PBKDF2 iteration count (50,000) is below current OWASP guidance** (§5.5).
8. **`handleRefresh` for UMS may be miswired to `handleLogin`** — verify the `/api/v1/auth/refresh` flow actually works end-to-end (§3).
9. **Dual lockfiles (`npm` + `pnpm`) risk dependency drift** — CI only validates one (§2, §10).
10. **No dependency/CVE scanning in CI** — no Dependabot/CodeQL/`npm audit` (§10, §13).
11. **No lint step in CI** despite lint scripts existing in 3 of 4 apps (§8, §13).

### 🟢 Low
12. Non-constant-time comparisons for CSRF token and admin setup key (§5.6).
13. OAuth access tokens stored in plaintext (§5.6).
14. `dangerouslySetInnerHTML` pattern in `Login.tsx`, currently unreachable but risky precedent (§5.6).
15. Stale one-off preview-deploy origins accumulating in the CORS allowlist (§5.6).
16. Cloudflare account/database IDs committed in `wrangler.jsonc` (§5.6).
17. Empty `bmi-portal/` directory; root-level markdown clutter (§2, §11).
18. Terraform doesn't cover Workers/Pages/secrets, so infra isn't fully reproducible from source (§2, §7).
19. Public/CMS endpoints hit D1 on every request with no edge caching (§6).

---

## 15. Refactoring Roadmap

**Phase 0 — Before the next production deploy (1–2 days):**
- Fix the two IDOR bugs (§5.1) — add ownership checks in `handleGetStudent` and `handleListGrades`, or scope the ID at the router level for the `student` role.
- Fix the timetabling role-check gap (§5.2).
- Decide on email verification: either re-enable the check in `handleLogin` (and fix `handleResendVerification`), or explicitly document that verification is advisory-only for this deployment and remove the now-misleading UI copy that implies otherwise.
- Add regression tests for all three, following the pattern in §12.

**Phase 1 — Next sprint (3–5 days):**
- Split `JWT_SECRET` and the password pepper into independent secrets; add a rotation runbook.
- Bump PBKDF2 iterations after measuring Worker CPU-time headroom on login.
- Add `npm run lint` to the CI `test` job for all four packages (add a lint script to `apps/api` first).
- Enable Dependabot for the repo (near-zero effort).
- Delete `pnpm-lock.yaml`/`pnpm-workspace.yaml` (or migrate fully to pnpm and delete `package-lock.json` — pick one).

**Phase 2 — Within the quarter (1–2 weeks):**
- Replace the `index.ts` if/else router with a declarative route table (`{method, path, roles, handler}[]`) that a small dispatcher iterates over — this directly prevents the class of bug in Critical/High findings #1–3 by making "which roles can hit this route" a single visible field instead of something copy-pasted per branch.
- Build out API test coverage for the remaining ~20 untested route modules, prioritizing anything touching student PII, grades, and finance.
- Add a required-reviewer gate (GitHub Environments) on the production deploy jobs.
- Add edge caching (Cache API/KV) for public/CMS GET endpoints.
- Consolidate root-level audit docs into `docs/audits/`.

**Phase 3 — Opportunistic:**
- Expand Terraform to cover Workers, Pages projects, and DNS so infra is reproducible from source.
- Consider per-device sessions if "log out only this device" or "view active sessions" becomes a product requirement.
- Publish the existing OpenAPI snapshot as actual developer-facing API docs.

---

## 16. Suggested Code Changes

### 16.1 Fix the student-profile IDOR

```ts
// apps/api/routes/ums-students.ts
export async function handleGetStudent(
  request: Request,
  env: Env,
  studentId: string,
  callerId: string,
  callerRole: string
): Promise<Response> {
  const isSelf = studentId === callerId; // also matches if caller passed their own reg_no—resolve first if needed
  if (callerRole === 'student' && !isSelf) {
    // Also guard against a student passing another student's reg_no:
    const owner = await env.DB.prepare(
      `SELECT user_id FROM students WHERE user_id = ? OR reg_no = ?`
    ).bind(studentId, studentId).first<{ user_id: string }>();
    if (!owner || owner.user_id !== callerId) {
      return error('Forbidden', 403);
    }
  }
  // ...existing query...
}
```
```ts
// apps/api/index.ts — pass caller context through
} else if (path.match(/^\/api\/v1\/students\/[^/]+$/) && method === 'GET') {
  const auth = await requireAuth(request, env, ['admin', 'staff', 'student']);
  if (auth instanceof Response) return withCors(auth, request, env);
  response = await handleGetStudent(request, env, path.split('/')[4], auth.user.sub, auth.user.role);
}
```

### 16.2 Fix the grades IDOR

```ts
// apps/api/routes/ums-grades.ts
export async function handleListGrades(
  request: Request, env: Env, callerId: string, callerRole: string
): Promise<Response> {
  const url = new URL(request.url);
  let studentId = url.searchParams.get('studentId');

  if (callerRole === 'student') {
    // Students can only ever see their own grades, regardless of what was requested.
    studentId = callerId;
  }
  // ...rest unchanged, using the (possibly overridden) studentId...
}
```

### 16.3 Fix the timetabling role gap

```ts
} else if (path === '/api/v1/timetabling' && method === 'POST') {
  const auth = await requireAuth(request, env, ['admin', 'staff']); // was: no role array
  if (auth instanceof Response) return withCors(auth, request, env);
  response = await handleCreateTimetabling(request, env);
```

### 16.4 Separate the password pepper from the JWT secret

```ts
// wrangler secret put PASSWORD_PEPPER   (new, independent secret)
const passwordHash = await hashPassword(password, env.PASSWORD_PEPPER); // was: env.JWT_SECRET
```
Add a migration note: existing password hashes were peppered with the old `JWT_SECRET` value, so either keep a fallback verify-path against the old secret during rollout, or force a password reset for all users when cutting over.

### 16.5 Example regression test for the IDOR fix

```ts
// apps/api/routes/ums-students.test.ts
it('student cannot fetch another student\'s profile', async () => {
  const res = await handleGetStudent(mockRequest(), env, otherStudentId, callingStudentId, 'student');
  expect(res.status).toBe(403);
});

it('student can fetch their own profile', async () => {
  const res = await handleGetStudent(mockRequest(), env, callingStudentId, callingStudentId, 'student');
  expect(res.status).toBe(200);
});
```

---

## 17. Closing Notes

The engineering judgment on display — cookie-only JWTs, tested localStorage exclusion, D1-backed rate limiting, constant-time password comparison, parameterized SQL everywhere, current-generation dependencies — is well above what's typical for a project this size. The Critical/High findings here are localized and mechanical to fix; they read as gaps in *consistency and test coverage* rather than gaps in security understanding. Closing Phase 0 above before the next production push is the single highest-leverage action available.
