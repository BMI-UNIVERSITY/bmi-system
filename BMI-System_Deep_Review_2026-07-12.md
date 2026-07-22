# BMI System — Deep Technical & Security Review
**Repository:** `BMI-UNIVERSITY/bmi-system`
**Reviewed commit:** `cd20f96` (main, 2026-07-11 17:00 EAT)
**Review date:** 2026-07-12
**Method:** Static review + live build — full `npm install`, `tsc --noEmit`, full Vitest run, `npm audit`, and an actual `wrangler deploy --dry-run` bundle build were executed against this checkout. Findings below are backed by file/line references and, where noted, command output — not inferred from documentation.

---

## 0. Executive Summary

BMI System is a single-developer, AI-assisted, rapidly-iterating Cloudflare Workers monorepo (API worker + 2 internal React SPAs + 1 Next.js marketing site) backing a real university's admissions, registration, and records system. The engineering fundamentals are genuinely good for a solo project: TypeScript strict mode with a **clean typecheck**, **337/337 tests passing**, **zero `npm audit` vulnerabilities**, parameterized SQL everywhere sampled, a mature Turbo-based CI/CD pipeline with weekly E2E and scheduled security scans, and an honestly-written architecture doc that documents a prior split-worker rollback rather than pretending it never happened.

However, the review surfaced a **critical, previously-undetected class of bug**: several live, reachable API endpoints — fee payment, LMS course/grade lookup, and alumni role transition — are wired through a "ports and adapters" abstraction layer to **in-memory stub adapters that were only ever intended for local testing**, not to any real payment gateway, LMS, or identity store. This is not a theoretical risk; it was confirmed by reading the actual dependency-injection wiring (`packages/bootstrap/src/index.ts`) used by the production `cloudflare` provider, and one of the three (`/api/alumni/transition`) is provably guaranteed to fail on every real call. The reason 337 tests didn't catch this is itself a finding: route tests mock the port interface directly, so they validate handler logic but never exercise the real adapter that's wired up in production.

Independently, the review found that the site's CSRF defense contains an inverted piece of logic that defeats it for authenticated users, and that password hashing exists in two diverged copies — the stronger one is dead code, and the weaker one (fewer PBKDF2 iterations) is what's actually live.

None of this diminishes the very real progress visible in the git history (33 migrations, a rolled-back split-worker architecture cleanly reverted, a hollow-row D1 bug fixed, brute-force columns added). It does mean the system is not yet safe to trust for real money or real identity data, and that the codebase has a recurring pattern — duplicated implementations of security-relevant code — that is worth fixing structurally, not just patching instance-by-instance.

**Overall system grade: C (functional core, critical trust-boundary gaps).** See §13 for the full scorecard.

---

## 1. Repository Structure

```
bmi-system/
├── apps/
│   ├── api/            Cloudflare Worker "bmi-api" — single monolith, all /api/* routes (~10.8K LOC, TS)
│   ├── portal/          React + Vite, CF Pages — public/applicant/student portal (~4.4K LOC, TS)
│   └── ums/             React + Vite, CF Pages — internal staff/registrar/admin UMS (~44.5K LOC, TS)
├── bmi-university/       Next.js (plain JS/JSX, not TS), CF Pages — marketing site
├── packages/
│   ├── shared/           Cross-app types, program catalog, grading logic
│   ├── ports/            Hexagonal-architecture interfaces (IDatabase, IPaymentProvider, ILMSProvider, …)
│   ├── adapters/         Implementations of the above: Cloudflare, AWS, Keycloak, Moodle, Stripe, Mailcow, Memory
│   ├── bootstrap/        Dependency-injection factory that wires ports → adapters per "provider"
│   ├── api-middleware/    Auth, JWT, CORS, rate limiting, logging, caching, tracing (the ones actually used)
│   └── rate-limiter/      A second, entirely separate, entirely unused rate-limiter implementation
├── docs/
│   ├── ARCHITECTURE.md, RUNBOOK.md, cache.md, database-migrations.md, api-conventions.md
│   └── audits/            9 prior audit/planning docs + a historical/ subfolder — a real, maintained audit trail
├── .github/workflows/     deploy.yml (Turbo CI + path-filtered Pages/Worker deploys), security.yml (npm audit + Trivy)
├── load-tests/, terraform/, scripts/, images/
└── package.json           npm workspaces monorepo, Turbo-orchestrated
```

**Scale:** ~63K lines of application TypeScript/JS across apps + packages, 33 D1 migrations, 72 test files, 50 commits (all from a single author), single active branch (`main`).

**Observation:** `apps/ums` is 4x the size of the API and portal combined. It's a large, feature-rich internal SPA (grading, timetabling, finance, hostels, library, medical records, visitor logs, inventory) built by one person in a matter of weeks. That velocity is impressive, but it also means the surface area most exposed to staff/registrar trust (bulk data operations, grade entry) is the least reviewed part of this audit — see §12 for scope notes.

---

## 2. Architecture Assessment

**Current deployed topology** (confirmed against `docs/ARCHITECTURE.md`, which is accurate and current):

- One Worker (`bmi-api`) handles **all** `/api/*` traffic — auth, admissions, UMS, documents, grades, webhooks, CMS, public endpoints. `apps/api/index.ts` is a single 427-line route table matched against ~150 regex-based routes.
- Three separate Cloudflare Pages projects (`bmi-portal`, `bmi-ums`, `bmi-university`) call that one Worker.
- D1 (`bmi-portal-db`) is the single source of truth; R2 holds documents/backups; one Cloudflare Queue handles async email.
- A **domain-worker split ("Phase 2") was designed, partially built, and deliberately rolled back** on 2026-07-09. This is documented in-repo, not just in memory — `docs/ARCHITECTURE.md` states this explicitly and dates it. This is good practice: most teams don't write down architecture decisions they backed out of.
- A "WriteQueue Durable Object" was designed to serialize D1 writes under load but is **not active**; production writes go directly to D1. This is acknowledged in the same doc.

**The ports-and-adapters layer is the architecturally interesting part of this system, and it's also where the most serious findings live (§5).** `packages/ports` defines 16 interfaces (`IDatabase`, `IPaymentProvider`, `ILMSProvider`, `IIdentityProvider`, `INotificationService`, etc.); `packages/adapters` implements each against Cloudflare, AWS, Keycloak, Moodle, Stripe, Mailcow, and in-memory backends; `packages/bootstrap` wires the right adapter set based on a `PLATFORM_PROVIDER` env var (`cloudflare | aws | local | open`).

This is a reasonable pattern *in principle* — it reduces Cloudflare lock-in and makes local testing possible without live infra. In practice, for a single-provider, single-developer, Cloudflare-only deployment, it has been built out much further than the system currently needs (full AWS Postgres/Redis/SQS/Secrets-Manager adapters, a Keycloak adapter, a Moodle adapter, a Mailcow adapter — none of which are deployed anywhere), and — critically — **four of the ports in the one provider that *is* live (`cloudflare`) are wired to the in-memory/testing adapters, not real ones** (§5.1). The abstraction's main current effect is to make "is this endpoint actually connected to anything real?" a non-obvious question that requires tracing through three packages to answer — which is exactly how this went unnoticed.

**Recommendation:** Either finish wiring the `cloudflare` provider's remaining ports to real services, or — more realistically, given team size — delete the `aws`, `local`-beyond-testing, and `open` provider branches and the adapters they alone justify (Keycloak, Moodle, Mailcow, Postgres, Redis, SQS, AWS Secrets Manager), and keep the ports abstraction only where it's actually earning its complexity (storage, email, database — which *are* fully wired). Speculative portability that isn't exercised isn't reducing risk; it's hiding it.

---

## 3. Code Quality Assessment

**Positives (verified, not assumed):**
- `strict: true` in `apps/api/tsconfig.json`; `npx tsc --noEmit` on the current checkout **passes with zero errors**.
- ESLint configured with `typescript-eslint` recommended rules across the API app.
- Consistent, idiomatic use of parameterized D1 queries (`.bind()`) — every handler sampled across `auth.ts`, `apply.ts`, `documents.ts`, `admin.ts`, `enrollment.ts` uses bound parameters; no string-concatenated SQL was found.
- Centralized request validation via Zod schemas (`apps/api/lib/schemas.ts`) with a single `parseBody()` chokepoint that guarantees a standardized 400 shape — good discipline, explicitly called out in that file's own header comment.
- Structured logging (`createLogger`/`requestLogger` in `@bmi/api-middleware`) exists and is used in the main router.

**Negatives:**
- **Duplicated, drifted implementations of security-relevant logic** (detailed in §5.3 and §8) — this is the single biggest code-quality issue in the repo. It's not cosmetic: it's already caused a live security regression.
- 34 raw `console.log` calls in `apps/api` alongside the structured logger — inconsistent logging discipline; structured fields (request ID, route, user) are lost on these lines.
- `apps/api/scripts/` contains six overlapping refactor scripts (`refactor.js`, `refactor.mjs`, `refactor.ts`, `refactor2.mjs`, `fix-imports.mjs`, `clean-imports.mjs`) — one-off migration tooling left in the tree with no indication of which (if any) are still needed. Low risk, but repo hygiene debt that will confuse the next contributor.
- The marketing site (`bmi-university/`) is plain JS/JSX with no type checking, `jsconfig.json` instead of `tsconfig.json` — the only untyped corner of an otherwise fully-TypeScript monorepo. It also carries its own `CLAUDE.md`/`AGENTS.md`/`CHANGELOG-CONTRACT.md` and a nested `.github/PULL_REQUEST_TEMPLATE.md`, suggesting it was bootstrapped as an independent project and folded in without full harmonization.

**Code Quality Score: 6.5 / 10** — clean, strict, well-validated code at the handler level; held back by structural duplication and repo hygiene debt.

---

## 4. Security Assessment — Critical Findings

This is the most consequential section of the review. Findings are presented with the exact evidence trail.

### 4.1 CRITICAL — Payment, LMS, and Identity endpoints are wired to non-functional stub adapters in production

`packages/bootstrap/src/index.ts`, `buildCloudflare()` (the function used whenever `PLATFORM_PROVIDER` is unset or `'cloudflare'` — i.e., production):

```ts
identity: new MemoryIdentityAdapter(),   // TODO: replace with Keycloak/Okta adapter
lms: new MemoryLMSAdapter(),             // TODO: replace with Moodle/Canvas adapter
payment: new MemoryPaymentAdapter(),     // TODO: replace with Stripe/PayPal adapter
notification: new MemoryNotificationAdapter(), // TODO: replace with Twilio/Slack adapter
```

These `Memory*` classes are plain in-process `Map`-backed stubs (`packages/adapters/src/memory/*.ts`), meant for unit tests. They are **live and reachable** through real, routed endpoints:

| Endpoint | Handler | Port called | Effect |
|---|---|---|---|
| `POST /api/student/invoices/:id/pay` | `handlePayInvoice` (`routes/student.ts:117`) | `payment.createPaymentIntent` | Returns a fabricated `clientSecret`; no real charge; nothing survives past the current Worker isolate |
| `POST /api/payment/create-intent` | `handleCreatePaymentIntent` (`routes/payment.ts`) | `payment.createPaymentIntent` | Same |
| `POST /api/payment/webhook` | `handlePaymentWebhook` (`routes/payment.ts`) | `payment.handleWebhook` | Looks up the intent in the same in-memory `Map`; since Workers give no isolate affinity guarantee between the create call and the webhook call, this will typically throw `Payment intent not found` even in the stub's own terms |
| `GET /api/lms/courses`, `GET /api/lms/grades` | `handleLmsCourses`/`handleLmsGrades` (`routes/lms.ts`) | `lms.getCourses`/`getGrades` | Always returns an empty result — the in-memory store is never populated |
| `POST /api/alumni/transition` (admin-only) | `handleTransitionToAlumni` (`routes/alumni.ts`) | `identity.updateUser` | **Provably fails on every invocation** — see below |

`MemoryIdentityAdapter.updateUser()` throws `User not found` unless `identity.createUser()` was called first for that ID. A repo-wide grep confirms `identity.createUser` is **never called anywhere** — real users are created directly in D1 (`routes/auth.ts`), not through this port. So the in-memory identity `Map` is permanently empty, and `POST /api/alumni/transition` will throw on line 1 of its body for every real user, every time, returning HTTP 500. This isn't a data-correctness bug; it's a 100%-reproducible outage on a real, admin-facing, routed endpoint.

There is a real `StripeAdapter.ts` (`packages/adapters/src/stripe/`) and a real `MoodleAdapter.ts` and `KeycloakAdapter.ts` sitting in the codebase, fully implemented — **none of them are wired into `buildCloudflare()`**. No M-Pesa, Pesapal, or Flutterwave integration exists anywhere in this repository (confirmed by full-text search), despite fee payment being a routed, student-facing feature and despite `migrations/0028_finance_ledger.sql` existing to record it.

**Why 337 passing tests didn't catch this:** see §4.4 and §9 — the tests mock the port interface itself, not the wired-up adapter.

**Impact:** any student who reaches the "pay invoice" flow gets a payment form that cannot possibly complete a real charge; any admin who tries to transition a graduating student to alumni status gets a 500 error, every time.

**Fix:** Short-term, make failure loud instead of silent — have `buildCloudflare()` throw at startup (or the individual handlers return `501 Not Implemented`) for any port that has no real backing configured, rather than quietly serving a stub that looks like success. Medium-term, either wire the real `StripeAdapter` (or an M-Pesa/Pesapal adapter matching the earlier payment-integration plan) and drop the identity port for alumni transition in favor of the direct D1 update every other role-change in this codebase already uses.

### 4.2 CRITICAL — CSRF protection is defeated for every authenticated write request

`apps/api/lib/types.ts:189`:

```ts
export function validateCsrfToken(request: Request): boolean {
  const cookieHeader = request.headers.get('Cookie');
  // If the request carries a valid auth token (HttpOnly, not accessible to XSS),
  // CSRF is already mitigated — skip the additional token check.
  if (cookieHeader?.includes('bmi_token=')) return true;
  ...
}
```

The reasoning in the comment is backwards. HttpOnly protects a cookie from being **read** by JavaScript (XSS) — it does nothing to stop the cookie from being **sent automatically** by the browser on a cross-site request, which is the entire premise of CSRF. This matters more here than in a typical app, because the login handler sets `bmi_token` with `SameSite=None` (`routes/auth.ts:255`, required since the portal and API live on different subdomains) — which explicitly opts the cookie into being sent on cross-site requests, removing the browser's own default CSRF mitigation. Combined, the code checks "is this an authenticated request?" and, if yes, treats that as proof the request isn't forged — when authenticated requests are precisely the ones CSRF protection exists to protect.

`parseBody()` (`apps/api/lib/schemas.ts:73`) calls `request.json()` without checking `Content-Type`, so a cross-site form or `fetch` request using a CORS-"simple" content type (e.g. `text/plain`) whose body happens to be valid JSON can reach state-changing handlers without a CORS preflight ever being triggered — the preflight is the other mechanism that would normally have blocked this.

**Impact:** for any authenticated, non-exempt state-changing endpoint (course enrollment, profile/settings changes, document uploads, admin actions), a third-party site can trigger the request on a logged-in user's behalf; the attacker doesn't need to read the JSON response to cause the side effect.

**Fix:** remove the `bmi_token` short-circuit entirely. Validate the CSRF token pair (cookie + header) on every state-changing request regardless of authentication state; the exemption list for genuinely pre-auth endpoints (`login`, `register`, etc.) can stay as-is.

### 4.3 CRITICAL — Duplicated password hashing; the weaker copy is the one that's live

Two independent implementations of `hashPassword`/`verifyPassword` exist:

- `packages/api-middleware/src/jwt.ts` — **100,000** PBKDF2-SHA256 iterations, pepper required. **Never imported by any password-hashing call site in the repo** — confirmed by grep; it is dead code.
- `apps/api/lib/jwt.ts` — **40,000** iterations, pepper optional (`pepper?: string`, falls back to an empty string if omitted — never actually hit today since callers always pass `env.PASSWORD_PEPPER`, but a silent, un-erroring fallback for a security-critical secret is a footgun waiting for the next refactor). **This is the copy actually imported** by `routes/auth.ts`, `routes/admin.ts`, `routes/claim.ts`, and `scripts/reset-admin-worker.ts` — i.e., every real registration, admin-created account, claim flow, and password reset in the system.

Both copies use a correct constant-time comparison for the final hash check, which is good — the bug here isn't the algorithm, it's that **the version someone clearly hardened (100k iterations) isn't the version protecting real users.** This is precisely the failure mode of maintaining two copies of the same security-critical function: a future "fix PBKDF2 iterations" commit has a 50/50 chance of landing in the unused file.

**Fix:** delete `apps/api/lib/jwt.ts`'s password functions, import from `@bmi/api-middleware` everywhere, and settle on one iteration count with an explicit comment justifying the number against Cloudflare Workers' CPU-time budget (both 40k and 100k are below current OWASP guidance of 600k+ for PBKDF2-SHA256; if CPU budget is the constraint, that's worth stating explicitly and considering a move to Argon2id via WASM, which is far more CPU-efficient per unit of attacker cost).

### 4.4 HIGH — No functional brute-force / account-lockout protection

`migrations/0013_add_brute_force_protection.sql` adds `failed_login_attempts` and `locked_until` columns to `users`. **`handleLogin` (`routes/auth.ts`) never reads or writes either column.** The only test that references them (`routes/auth.test.ts:245`) sets them as inert mock values, with the comment `// brute force check / session` — it doesn't assert lockout behavior, because there is none to assert.

The only real defense against credential stuffing on `/api/auth/login` is the generic rate limiter: 50 requests/minute **per source IP, per endpoint** (`apps/api/middleware/auth.ts` — see §4.6 for why this file is actually dead code, and note the *live* limiter in `packages/api-middleware/src/rate-limit.ts` uses the same 50/60s default). That's a coarse, easily-distributed limit, not an account-level lockout — it doesn't stop a slow, distributed, or single-target attack.

**Fix:** implement the lockout the schema already supports — increment `failed_login_attempts` on a failed password check, set `locked_until` after N consecutive failures, check and honor it before attempting password verification, and reset the counter on success.

### 4.5 Positive findings worth stating explicitly

- **Password-verification ordering correctly avoids account enumeration** — `handleLogin` checks the password *before* checking `is_verified`/`account_claimed`, with an explicit comment referencing this as a fix for a prior finding. Good practice, correctly implemented.
- **Document downloads are properly authorized** — `handleDownloadDocument` (`routes/documents.ts:122`) checks owner-or-staff/admin before serving any file; no IDOR found here.
- **Admin bootstrap endpoint is well hardened** — `handleAdminSetup` (`routes/admin.ts:6`) requires a secret set via `wrangler secret put`, compares it with `crypto.subtle.timingSafeEqual` (constant-time), and refuses to run a second time once any admin exists.
- **CORS/security headers are centralized and reasonably strict** — `withCors()` sets a real CSP (`default-src 'self'`, no `unsafe-inline` for scripts), HSTS with `preload`, `X-Frame-Options: DENY`, and a locked-down `Permissions-Policy`. Origin allow-listing is explicit, not wildcarded.
- **SQL injection surface is well controlled** — every query sampled across ~10 route files uses `.bind()`; no string interpolation into SQL was found.
- **`npm audit` reports zero vulnerabilities**, both with and without dev dependencies, at time of review.

### 4.6 MEDIUM — Triplicated authentication/rate-limiting code

Beyond the password-hashing duplication (§4.3), there is a **third, entirely separate rate-limiter** (`packages/rate-limiter`, `@bmi/rate-limiter`) that is built by the root `prepare` script but **imported nowhere** in the application. And `apps/api/middleware/auth.ts` is a full duplicate of `requireAuth`/`rateLimit` — also confirmed unused (the router imports these from `@bmi/api-middleware` instead). Three parallel implementations of the same two security primitives, two of which are dead, is a maintenance and audit hazard in its own right: it's exactly this kind of fork that produced the password-hashing bug in §4.3, and it means a security reviewer (or an AI assistant) grepping for "the" auth code can easily land on the wrong copy.

**Security Assessment Score: 4 / 10.** Good hygiene on the parts that were built carefully (SQL, headers, admin bootstrap, document ACLs); critical, concrete gaps on the parts that weren't (payment/identity wiring, CSRF, password hashing consolidation, brute force). This is a "do not process real payments or treat alumni transitions as reliable until §4.1–4.4 are fixed" verdict, not a "the whole system is insecure" verdict.

---

## 5. Performance Analysis

**Positives:**
- Read-heavy public endpoints use the Cloudflare Cache API with explicit TTLs and explicit invalidation on mutation (`packages/api-middleware/src/cache.ts`, referenced from `docs/cache.md`) — a sensible mitigation for D1 read load.
- `lib/performance.ts` and `lib/batch_operations.ts` provide `executeWithMonitoring`/`executeBatch` helpers, and they're used in the hot registration/login paths (`routes/auth.ts`) — the team clearly knows the batching pattern.
- The deployed Worker bundle is **758 KB gzipped** (measured via a real `wrangler deploy --dry-run`), comfortably under Cloudflare's 10 MB (Paid plan) compressed-script limit. Not a current risk.

**Finding — Sequential per-item D1 round trips instead of batching, in a hot registration-period path:**

`handleAutoEnrollMandatory` (`apps/api/routes/enrollment.ts:152-171`) loops over a program's mandatory courses and, **per course, sequentially awaits** a `SELECT` (check existing registration) followed by up to two `INSERT`s:

```ts
for (const course of mandatoryCourses) {
  const existing = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT id FROM ...`).bind(...).first();
  if (existing) { skipped++; continue; }
  await env.PLATFORM_CONTEXT!.db.prepare(`INSERT INTO student_course_registrations ...`).bind(...).run();
  await env.PLATFORM_CONTEXT!.db.prepare(`INSERT OR IGNORE INTO enrollments ...`).bind(...).run();
  enrolled++;
}
```

For a curriculum with 8–12 mandatory courses, that's 16–36 sequential D1 round trips for a single API call, each paying full network latency rather than being batched. The same non-batched, non-transactional pattern recurs in `academic_standing.ts` (nested loops at lines 77–194) and the elective-selection path (`enrollment.ts:220,269,526,540`). Given `lib/batch_operations.ts` already exists and is used elsewhere, this looks like an oversight rather than a constraint.

This matters most because it's concentrated in **registration-period code** — exactly the window where many students hit these endpoints concurrently, which is also D1's known weak point (single-writer-per-database; the project's own `RUNBOOK.md` documents `SQLITE_BUSY` triage).

**Fix:** wrap each course's SELECT+INSERT+INSERT in a single `db.batch([...])` call, or restructure as one batched existence-check query followed by one batched multi-row insert; wrap the whole operation in a transaction so a mid-loop failure doesn't leave a partially-enrolled student.

**Performance Score: 6.5 / 10.**

---

## 6. Scalability Review

- **D1 is single-writer per database.** The project has already hit this in production (per `RUNBOOK.md`'s `SQLITE_BUSY` guidance) and consciously chose *not* to solve it with the Durable-Object write-queue design that was drafted (it exists in `packages/adapters` as `CloudflareWriteQueueAdapter`/`MemoryWriteQueueAdapter` but is unbound in `wrangler.jsonc` and therefore always falls back to the in-memory queue, which provides no real serialization across isolates). That's a defensible choice at current scale, but the non-batched write loops in §5 make write contention worse than it needs to be during the highest-concurrency period (registration), not better.
- **D1's 10 GB per-database ceiling** is not close to being a concern at BMI's stated scale (single institution, thousands of students) but is worth knowing about if BMI ever pursues true multi-campus, multi-tenant growth — D1's own guidance for that scenario is horizontal scale-out across *multiple* databases, which this schema is not currently designed for (one `bmi-portal-db` for everything).
- **Cloudflare Queues** (email) and **R2** (documents/backups) are both horizontally scalable by design and appropriately used here; no concerns.
- The single-monolith-Worker decision (post split-worker-rollback) is the right call for this team size: it trades some theoretical scaling headroom for dramatically lower operational complexity, and the current 758 KB bundle leaves plenty of room to grow before bundle size becomes a real constraint.

**Scalability Score: 6 / 10** — appropriate architecture for current scale, with an avoidable self-inflicted contention risk at the exact moment (registration) load is highest.

---

## 7. Maintainability Score

Maintainability is where the "single developer, AI-assisted, rapid iteration" working style shows its costs most clearly:

- **Duplication is the dominant maintainability risk** (§4.3, §4.6, and the ports/adapters over-build in §2) — three cross-cutting concerns (rate limiting, password hashing, and arguably the ports abstraction itself) each have more implementations than are in use. Every one of these is a place where the *next* fix — by Joseph, by a future hire, or by an AI coding agent working from a partial diff — can land in the wrong copy, as already happened in §4.3.
- **`apps/ums` at 44.5K LOC** is by far the largest, least-uniform part of the codebase (it contains, among other things, an entire `GradeAutomationService`/`GradeDeadlineService` pair that is almost entirely `// TODO: Implement ...` stubs — see §8). A codebase this size maintained by one person is a real bus-factor risk independent of any specific bug.
- **README staleness** (§10) means the first thing a new contributor (human or AI) reads describes an architecture (`apps/workers/{auth,ums,core,webhooks,public}`) that was deliberately rolled back and no longer exists, while the *correct* current topology is one directory level deeper in `docs/ARCHITECTURE.md`. This is a small fix with outsized value, precisely because it's the entry point.
- **Positive:** naming, file organization within each app (routes/lib/middleware/migrations split in `apps/api`), and Zod-schema centralization are all consistent and easy to navigate once you're inside a given app.

**Maintainability Score: 5 / 10.**

---

## 8. Technical Debt Analysis

Concrete, grep-verified debt inventory (not speculative):

| Item | Location | Nature |
|---|---|---|
| Orphaned duplicate auth middleware | `apps/api/middleware/auth.ts` | Full copy of `requireAuth`/`rateLimit`, unused, unimported |
| Unused rate-limiter package | `packages/rate-limiter` | Built in CI, imported nowhere |
| Unused, stronger password-hashing copy | `packages/api-middleware/src/jwt.ts` `hashPassword`/`verifyPassword` | Dead code; see §4.3 |
| Stub payment/LMS/identity/notification adapters live in production | `packages/bootstrap/src/index.ts:128-133` | See §4.1 — this is debt that became a bug |
| `GradeAutomationService`/`GradeDeadlineService` largely unimplemented | `apps/ums/src/grading/services/*.ts` | 11 of ~15 methods are `// TODO: Implement ...` stubs — if any UI already calls these expecting real behavior, that's a second silent-stub problem worth checking beyond this review's scope |
| Image resizing not implemented | `apps/api/lib/compress-image.ts:31` | `// TODO: Implement actual resizing in future` |
| Six overlapping one-off refactor scripts | `apps/api/scripts/refactor*.{js,mjs,ts}` | Unclear which, if any, are still needed |
| Dead CI step | `.github/workflows/deploy.yml` "Inject Cloudflare IDs" `sed` step | Targets a `${CLOUDFLARE_D1_ID}` placeholder that no longer exists in `wrangler.jsonc` (the ID is now hardcoded there) — currently a harmless no-op, but indicates the secret-templating approach was abandoned without cleaning up the step that assumed it |
| Misclassified runtime dependencies | `packages/bootstrap/package.json` | `pg`, `ioredis`, `@aws-sdk/client-sqs`, `@aws-sdk/client-secrets-manager` are statically imported at module scope in `src/index.ts` but declared as `devDependencies`, not `dependencies` — fine under the current single-lockfile workspace install, but would break a leaner/production-only install |

**Technical Debt Score: Moderate-High.** Most items are individually low-cost to fix; the pattern behind them (parallel implementations, stub-as-placeholder-that-shipped) is the part worth addressing structurally.

---

## 9. Testing Quality

**What's genuinely good:**
- 33 test files, **337/337 passing** on a clean run of this checkout (`vitest run`, apps/api).
- Broad route coverage — every major route module (`auth`, `admin`, `enrollment`, `academic_standing`, `ums-*`, `payment`, `lms`, `alumni`, `webhooks`, `documents`, `claim`, `public`, `cms`, `recommendations`) has a corresponding `.test.ts`.
- Snapshot testing for the OpenAPI spec (`lib/openapi.snapshot.test.ts`) — a nice touch that catches unintended API-surface drift.

**The structural gap — and it's a significant one:** every route test constructs its `env` via a shared `makeEnv()` helper (`routes/test-helpers.ts`) that mocks `PLATFORM_CONTEXT.<port>.<method>` directly with `vi.fn()`. That means a test like:

```ts
env.PLATFORM_CONTEXT.identity.updateUser.mockResolvedValue(...)
```

verifies "the handler calls `identity.updateUser` with the right arguments and handles the response correctly" — which is a fine, legitimate unit test — but it **never once instantiates or exercises the actual adapter that `packages/bootstrap` wires up in production.** The entire critical finding in §4.1 (payment/LMS/identity all silently backed by non-functional stubs) is invisible to this test suite by construction: the tests mock exactly the boundary where the bug lives. This was confirmed directly by reading `routes/alumni.test.ts`, `routes/payment.test.ts`, and `routes/lms.test.ts` — all three mock the port, none instantiate `MemoryIdentityAdapter`/`MemoryPaymentAdapter`/`MemoryLMSAdapter` or assert anything about the real bootstrap wiring.

This is the same category of gap flagged in Joseph's own prior admissions-pipeline audit (mocks mirroring broken behavior rather than catching it) — it recurs here in a different subsystem, which suggests it's a pattern in how the test suite is built, not a one-off.

**Fix:** add a small number of integration-style tests that call `bootstrap(env)` with `PLATFORM_PROVIDER=cloudflare` and a realistic fake `env`, then exercise at least one write through each port, asserting on the *adapter's* real behavior (or its documented absence, e.g. "payment adapter is not yet real — assert it throws/returns 501" as an explicit, intentional test rather than an accidental gap). Also worth one E2E-level smoke test per money-touching or identity-touching endpoint, since the existing weekly Playwright E2E run (`apps/ums`) does not appear to cover these API endpoints directly.

**Testing Quality Score: 5.5 / 10** — strong on breadth and discipline, weak on the one axis (wiring correctness) that mattered most this review.

---

## 10. CI/CD Evaluation

This is one of the strongest parts of the repository, and stands in contrast to a prior audit's finding that CI/CD was "invisible to GitHub Actions" — that issue is clearly resolved.

- `.github/workflows/deploy.yml`: path-filtered change detection (`dorny/paths-filter`) so only affected apps rebuild/redeploy; a single Turbo-orchestrated `build lint type-check test` job with proper `node_modules`/Turbo cache restoration; separate, independent deploy jobs per target (`bmi-api` Worker, `bmi-portal`/`bmi-ums`/`bmi-university` Pages) gated on the CI job passing; a weekly scheduled Playwright E2E run against `apps/ums`.
- `.github/workflows/security.yml`: `npm audit --audit-level=high` with `continue-on-error: false` (hard-fails the build on high/critical CVEs) plus a Trivy vulnerability scan, both on push/PR and a weekly schedule.
- Minor nit: the "Inject Cloudflare IDs" `sed` step in `deploy-api` targets a placeholder that no longer exists in `wrangler.jsonc` (see §8) — dead but harmless.

**CI/CD Score: 8 / 10.**

---

## 11. Dependency Review

- **`npm audit` (root, full workspace): 0 vulnerabilities**, both including and excluding devDependencies, as of this review's `npm install`.
- `overrides` in the root `package.json` pin several transitive deps (`cookie`, `esbuild`, `postcss`, `undici`, `uuid`, `ws`) to patched minimum versions — a sign of active dependency hygiene, not just default versions.
- TypeScript 5.8.x, Wrangler 4.107, Vitest 4.1.x, Zod 3.25.x — all current-generation, not stale majors.
- The one concrete issue is the `devDependencies` misclassification of `pg`/`ioredis`/AWS SDK clients in `@bmi/bootstrap` (§8) — a correctness issue for dependency *declaration*, not a vulnerability.
- The dependency surface itself is larger than the deployed system needs, for the same reason as §2: Keycloak admin client, Stripe SDK, `pdf-lib`, `ioredis`, `pg`, two AWS SDK clients are all present for adapters that aren't wired into the live provider.

**Dependency Review Score: 8.5 / 10.**

---

## 12. Documentation Review

- `docs/ARCHITECTURE.md` is **accurate, current, and unusually honest** — it explicitly documents the split-worker rollback with a date, states plainly what's "not currently deployed," and doesn't oversell the WriteQueue design as active when it isn't. This is genuinely above-average engineering documentation.
- `docs/RUNBOOK.md`, `docs/cache.md`, `docs/database-migrations.md`, `docs/api-conventions.md` all exist and are linked correctly from the README.
- `docs/audits/` contains a real, dated trail of prior audits and their remediation status — a good practice that made this review faster and more targeted.
- **The top-level `README.md` is stale** and is the one place a new reader (or a new AI session with no memory) is likely to form an incorrect mental model first: its repository-structure diagram shows `apps/workers/{auth,ums,core,webhooks,public}` (the rolled-back split-worker layout) and `packages/middleware` (the actual package is `packages/api-middleware`), and its local-dev instructions (`cd apps/workers/ums && npm run dev`) reference a path that does not exist in this checkout. It also still carries a Windows-style `D:\BMI\` path fragment. None of this is dangerous, but it's the literal front door of the repository giving the wrong architecture on first read.
- No per-route API reference beyond the OpenAPI snapshot test was found in-repo; `docs/api-conventions.md` covers conventions but not a generated endpoint catalog. Given ~150 routes exist, an auto-generated OpenAPI doc page (the scaffolding for which already exists — `lib/openapi.ts`) would be a low-cost, high-value addition.

**Fix:** update the README's structure diagram and quickstart commands to match `docs/ARCHITECTURE.md` (which is already correct) — this is a 15-minute fix with disproportionate value for onboarding.

**Documentation Score: 6.5 / 10** — excellent where it matters most (architecture decisions), let down by a stale entry point.

---

## 13. Scorecard Summary

| Dimension | Score (/10) | One-line rationale |
|---|---|---|
| Code Quality | 6.5 | Strict TS, clean typecheck, good validation discipline; undermined by duplicated implementations |
| Security | 4.0 | Payment/LMS/identity stub-wiring + CSRF logic flaw + split password hashing are real, live gaps |
| Performance | 6.5 | Cache API used well; non-batched writes in the highest-traffic registration path |
| Scalability | 6.0 | Appropriate monolith-on-D1 choice for scale, undercut by avoidable write contention |
| Maintainability | 5.0 | Duplication + a 44K-LOC single-owner frontend are real bus-factor/drift risks |
| Technical Debt | 5.0 (moderate-high volume, low-cost-per-item) | Mostly cheap fixes; the *pattern* behind them needs a structural decision |
| Dependency Health | 8.5 | Zero known vulnerabilities, active pinning, current majors |
| Testing Quality | 5.5 | Broad, passing, disciplined — but structurally blind to adapter-wiring bugs |
| CI/CD | 8.0 | Mature, cached, path-filtered, security-scanned |
| Documentation | 6.5 | Architecture docs excellent and honest; README stale |
| **Overall** | **~6.0 (C)** | Solid, fast-moving engineering with a critical trust-boundary gap that needs to be closed before real money or identity changes flow through the affected endpoints |

---

## 14. Prioritized Findings

### 🔴 Critical (fix before any real payment/identity traffic relies on these paths)
1. **Payment, LMS, and identity ports resolve to non-functional in-memory stubs in production** — `packages/bootstrap/src/index.ts:128-133`; affects `POST /api/student/invoices/:id/pay`, `POST /api/payment/create-intent`, `POST /api/payment/webhook`, `GET /api/lms/courses`, `GET /api/lms/grades`, `POST /api/alumni/transition` (the last of which fails 100% of the time). (§4.1)
2. **CSRF protection is bypassed for every authenticated state-changing request** — inverted logic in `validateCsrfToken`, `apps/api/lib/types.ts:189`. (§4.2)
3. **Live password hashing uses a weaker, unreviewed copy of the KDF (40k iterations) while a stronger, hardened copy (100k) sits unused** — `apps/api/lib/jwt.ts` vs. `packages/api-middleware/src/jwt.ts`. (§4.3)

### 🟠 High
4. **No functional brute-force/account-lockout protection** despite schema support (`migrations/0013`) — `routes/auth.ts` `handleLogin`. (§4.4)
5. **Test suite mocks the port boundary directly, structurally unable to catch adapter-wiring bugs like #1** — `routes/test-helpers.ts` `makeEnv()`. (§9)
6. **Triplicated rate-limiting/auth-middleware implementations**, two of three dead — `apps/api/middleware/auth.ts`, `packages/rate-limiter`. (§4.6)
7. **Non-batched, non-transactional per-course D1 writes in the auto-enrollment path**, worst at peak registration load — `apps/api/routes/enrollment.ts:152-171` (and similar loops at `academic_standing.ts:77-194`, `enrollment.ts:220,269,526,540`). (§5)

### 🟡 Medium
8. **Ports-and-adapters layer built well beyond current deployment needs** (AWS/Postgres/Redis/SQS/Keycloak/Moodle/Mailcow adapters, none live) — adds review/maintenance surface without current benefit. (§2)
9. **Misclassified runtime dependencies as devDependencies** in `packages/bootstrap/package.json` (`pg`, `ioredis`, AWS SDK clients). (§8)
10. **README.md structure diagram and quickstart commands are stale**, describing the rolled-back split-worker layout. (§12)
11. **`GradeAutomationService`/`GradeDeadlineService` are largely unimplemented stubs** — worth confirming no UI currently depends on them expecting real behavior. (§8)

### 🟢 Low
12. Dead CI "Inject Cloudflare IDs" step targeting a placeholder that no longer exists. (§8)
13. 34 raw `console.log` calls alongside the structured logger. (§3)
14. Six overlapping one-off refactor scripts left in `apps/api/scripts/`. (§3)
15. `bmi-university` marketing site is the only untyped (plain JS/JSX) corner of an otherwise all-TypeScript monorepo. (§3)
16. Constant-time password comparison is preceded by a plain-equality length check — negligible practical risk given fixed hash-hex length, but worth a comment. (§4.3)

---

## 15. Refactoring Roadmap

**Phase 0 — Stop the silent failures (days, not weeks):**
- Make `buildCloudflare()` fail loudly (throw at bootstrap, or have each affected handler return `501`) for any port still backed by a Memory adapter, until each is either wired for real or intentionally marked "not yet available" in the UI. This alone converts four silent failures into visible ones and buys time to fix them properly.
- Fix `validateCsrfToken` — delete the `bmi_token` short-circuit.
- Consolidate password hashing into `@bmi/api-middleware`; delete `apps/api/lib/jwt.ts`'s copy; decide and document one iteration count.

**Phase 1 — Close the trust-boundary gaps (1-2 weeks):**
- Wire a real payment adapter — either the existing unused `StripeAdapter`, or build the M-Pesa/Pesapal adapter matching the payment-integration plan already produced for this ecosystem, matching the actual Kenyan-market requirement.
- Replace `handleTransitionToAlumni`'s use of the identity port with a direct D1 update, consistent with every other role-change path in the codebase — this is simpler than fixing the port and removes the dependency entirely for this one call.
- Implement the brute-force lockout the schema already supports.
- Add integration-style tests that instantiate `bootstrap(env)` for real and exercise at least one call through each port — make "is this port really wired?" a CI-checked fact, not a manual audit finding.

**Phase 2 — Pay down structural duplication (2-3 weeks, can run alongside feature work):**
- Delete `apps/api/middleware/auth.ts` and `packages/rate-limiter` (or, if there's a reason to keep the latter, wire it in and delete the one in `api-middleware` — pick one, not both).
- Decide the ports-and-adapters scope: either commit to finishing the `aws`/`local`/`open` providers with real deployment targets, or delete the adapters/dependencies that only exist for providers nothing points at (Keycloak, Moodle, Mailcow, Postgres, Redis, SQS, AWS Secrets Manager) and keep the pattern only where it's fully wired (storage, email, database).
- Batch the sequential D1 write loops in `enrollment.ts`/`academic_standing.ts` using the existing `executeBatch`/`lib/batch_operations.ts` helpers, wrapped in transactions.

**Phase 3 — Polish (ongoing):**
- Refresh `README.md` to match `docs/ARCHITECTURE.md`.
- Clean up the refactor-script sprawl in `apps/api/scripts/`.
- Either implement or clearly gate off `GradeAutomationService`/`GradeDeadlineService`.
- Consider migrating `bmi-university` to TypeScript to match the rest of the monorepo, or explicitly document why it's intentionally excluded.

---

## 16. Suggested Code Changes

**16.1 — Fix the CSRF bypass** (`apps/api/lib/types.ts`):

```diff
 export function validateCsrfToken(request: Request): boolean {
   const cookieHeader = request.headers.get('Cookie');
-  // If the request carries a valid auth token (HttpOnly, not accessible to XSS),
-  // CSRF is already mitigated — skip the additional token check.
-  if (cookieHeader?.includes('bmi_token=')) return true;
   const csrfCookie = cookieHeader?.match(/csrf_token=([^;]+)/)?.[1];
   const csrfHeader = request.headers.get('X-CSRF-Token');
   return !!csrfCookie && !!csrfHeader && csrfCookie === csrfHeader;
 }
```

**16.2 — Fail loudly instead of silently on unwired ports** (`packages/bootstrap/src/index.ts`):

```diff
+function unimplemented<T extends object>(portName: string): T {
+  return new Proxy({}, {
+    get(_t, prop) {
+      throw new Error(
+        `[bootstrap] ${portName}.${String(prop)}() called, but no real adapter is ` +
+        `configured for the 'cloudflare' provider. Wire a real adapter or explicitly ` +
+        `handle this as "not yet available" in the caller.`
+      );
+    },
+  }) as T;
+}
+
 return {
   ...
-  identity: new MemoryIdentityAdapter(), // TODO: replace with Keycloak/Okta adapter
-  lms: new MemoryLMSAdapter(), // TODO: replace with Moodle/Canvas adapter
+  identity: unimplemented<IIdentityProvider>('identity'),
+  lms: unimplemented<ILMSProvider>('lms'),
   email: emailProvider,
-  payment: new MemoryPaymentAdapter(), // TODO: replace with Stripe/PayPal adapter
+  payment: unimplemented<IPaymentProvider>('payment'),
   document: new PdfDocumentAdapter(),
-  notification: new MemoryNotificationAdapter(), // TODO: replace with Twilio/Slack adapter
+  notification: unimplemented<INotificationService>('notification'),
   storage: storageProvider,
 };
```
This converts four silent, hard-to-discover failures into loud, immediate `500`s with an actionable error message — a strict improvement even before the real integrations are built, and it will make Phase 0 verification trivial (hit each endpoint once, confirm you get the new explicit error, not a fake success).

**16.3 — Bypass the identity port for alumni transition** (`apps/api/routes/alumni.ts`) — simpler and more consistent with the rest of the codebase than fixing the port:

```diff
 export async function handleTransitionToAlumni(req: Request, env: Env, userId: string): Promise<Response> {
   try {
-    await env.PLATFORM_CONTEXT!.identity.updateUser(userId, { roles: ['alumni'] });
+    await env.PLATFORM_CONTEXT!.db.prepare(
+      `UPDATE users SET role = 'alumni', updated_at = datetime('now') WHERE id = ?`
+    ).bind(userId).run();
```
(and swap the subsequent `identity.getUser(userId)` call for the equivalent direct `SELECT` — every other role-changing handler in this codebase already talks to D1 directly.)

**16.4 — Batch the auto-enrollment write loop** (`apps/api/routes/enrollment.ts`):

```diff
-  for (const course of mandatoryCourses) {
-    const existing = await env.PLATFORM_CONTEXT!.db.prepare(`SELECT id FROM student_course_registrations WHERE student_id = ? AND course_id = ? AND term_id = ?`).bind(userId, course.course_id, currentTerm.id).first();
-    if (existing) { skipped++; continue; }
-    await env.PLATFORM_CONTEXT!.db.prepare(`INSERT INTO student_course_registrations (...) VALUES (...)`).bind(...).run();
-    await env.PLATFORM_CONTEXT!.db.prepare(`INSERT OR IGNORE INTO enrollments (...) VALUES (...)`).bind(...).run();
-    enrolled++;
-  }
+  const { results: existingRegs } = await env.PLATFORM_CONTEXT!.db.prepare(
+    `SELECT course_id FROM student_course_registrations WHERE student_id = ? AND term_id = ?`
+  ).bind(userId, currentTerm.id).all<{ course_id: string }>();
+  const already = new Set(existingRegs.map(r => r.course_id));
+  const toEnroll = mandatoryCourses.filter(c => !already.has(c.course_id));
+
+  const stmts = toEnroll.flatMap(course => [
+    env.PLATFORM_CONTEXT!.db.prepare(
+      `INSERT INTO student_course_registrations (id, student_id, course_id, term_id, registration_type, status) VALUES (?, ?, ?, ?, 'auto', 'registered')`
+    ).bind(crypto.randomUUID(), userId, course.course_id, currentTerm.id),
+    env.PLATFORM_CONTEXT!.db.prepare(
+      `INSERT OR IGNORE INTO enrollments (id, student_id, course_id, status) VALUES (?, ?, ?, 'enrolled')`
+    ).bind(crypto.randomUUID(), userId, course.course_id),
+  ]);
+  if (stmts.length) await env.PLATFORM_CONTEXT!.db.batch(stmts);
+  const enrolled = toEnroll.length, skipped = mandatoryCourses.length - toEnroll.length;
```
Reduces the worst case from ~36 sequential round trips to 2 (one read, one batched write), and makes the write atomic.

---

## Appendix A — Verification Log

Commands actually run against this checkout during the review (not assumed from documentation):

```
git clone --depth 50 https://github.com/BMI-UNIVERSITY/bmi-system.git
npm install --no-audit --no-fund               → succeeded, 1141 packages, all workspace packages built clean
npx tsc --noEmit -p apps/api/tsconfig.json      → 0 errors
npx vitest run --passWithNoTests (apps/api)     → 33 files, 337 tests, 337 passed, 0 failed
npm audit / npm audit --omit=dev                → 0 vulnerabilities (both)
npx wrangler deploy --dry-run --outdir ...      → Total Upload: 3875.82 KiB / gzip: 758.17 KiB
```

## Appendix B — Scope Notes

This review focused on `apps/api` (the trust boundary — auth, payments, identity, data access) and the shared `packages/` it depends on, since that's where the highest-severity findings live. `apps/ums` (44.5K LOC) and `apps/portal` were reviewed at the level of imports/patterns (auth flows, XSS surface via `dangerouslySetInnerHTML`/raw `innerHTML` — none found) rather than exhaustively, given their size relative to review scope. `bmi-university` (marketing site) was reviewed structurally only, given its lower risk surface (no auth, no sensitive data). A follow-up pass specifically on `apps/ums`'s grading/finance/records modules — mirroring the depth applied here to `apps/api` — would be a reasonable next audit target given that app's size and its role for staff/registrar workflows.
