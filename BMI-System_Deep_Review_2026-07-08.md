# BMI-System (`BMI-UNIVERSITY/bmi-system`) — Deep Technical & Security Review

**Reviewer stance:** Senior engineer / security consultant reading the code cold
**Audit date:** July 8, 2026
**Commit reviewed:** `b717b545608ea4701d4fd530549dd418505f24b0` (`main`, 138 commits, single contributor)
**Method:** Fresh clone, full git history, live `npm install` / `npm audit` / `tsc --noEmit` / `eslint` / `vitest` / `next build` reproduction, static reading of every route module touched below, and one empirical benchmark (PBKDF2 CPU cost). This report does **not** trust prior audit documents already committed to the repo (`docs/audits/*`, `audit.md`) — every claim below was independently re-derived from the code, and disagreements with those documents are called out explicitly.

---

## 0. Executive Summary

This is a genuinely well-engineered system in several respects — real RBAC with explicit ownership checks, HMAC-verified webhooks, a hardened CORS/CSP header set, clean `tsc`/`eslint` output, zero known dependency vulnerabilities, and a CI pipeline with real security gates (Trivy, Gitleaks, hard-failing `npm audit`, path-filtered independent deploys). Several issues flagged in the repo's own historical audits — the student/grades IDOR, the email-verification login bypass, the broken marketing-site build, ungated deploys, an orphaned git submodule — are now **verifiably fixed**, and I confirmed each one by reading the current code rather than the changelog.

But the system has three **still-open, production-breaking issues**, and one **large architectural risk** that isn't documented anywhere in the repo:

1. **Every student's transcript and GPA is permanently blank.** Grades are written to a `grades` table; the transcript/GPA endpoint reads a completely different, never-written column (`enrollments.grade`). This is not a hypothetical — I traced every write path and confirmed nothing ever populates that column. This is the same bug flagged in your own prior audits; it is still present today.
2. **Password hashing likely exceeds the Cloudflare Workers Free-plan CPU budget on every login/register/reset call.** I benchmarked the exact PBKDF2 parameters in the code (100,000 iterations, SHA-256) and measured ~17–20ms — roughly 2x the platform's 10ms free-tier CPU limit. A commit exists titled "reduce PBKDF2 iterations to 100k... (CF Workers limit)" but 100k still doesn't fit the budget it was supposedly reduced to satisfy.
3. **Payment processing is a hardcoded mock** (`// Mock payment gateway: Just mark it as paid`) — no gateway is actually called anywhere in the codebase.
4. **The "Phase 2" domain-worker split (`bmi-auth`/`bmi-core`/`bmi-ums`/`bmi-webhooks`/`bmi-public`) is disconnected from production traffic.** Both frontends are built with `VITE_API_URL` hardcoded to the old monolith's `workers.dev` URL, not `api.hkmministries.org` where the new workers' routes live. The route handlers in the new workers are already-diverging forked copies of the monolith's handlers. `docs/ARCHITECTURE.md` describes this split as the current deployed reality; it isn't.

None of this requires a rewrite — items 1–3 are each a few hours of focused work, and item 4 is a decision (finish the cutover or delete the fork) rather than new engineering. Section 12 has the full prioritized list; Section 14 has concrete suggested fixes for the top three.

---

## 1. Repository Structure

```
bmi-system/                          (monorepo root, npm workspaces)
├── apps/
│   ├── api/            → Cloudflare Worker "bmi-api" — the monolith. STILL receives 100% of
│   │                      real frontend traffic (see §2.2). ~780KB, 21 route modules, 337-line router.
│   ├── portal/          → React 19 + Vite, Cloudflare Pages — applicant/admissions frontend
│   ├── ums/              → React 19 + Vite, Cloudflare Pages — staff/student UMS frontend
│   └── workers/          → Five separate Cloudflare Workers introduced 2026-07-06 ("Phase 2"):
│       ├── auth/          bmi-auth   — hosts the WriteQueue Durable Object
│       ├── core/           bmi-core   — forked copy of applications/admin/documents/cms/recs
│       ├── ums/             bmi-ums    — forked copy of students/courses/enrollments
│       ├── webhooks/        bmi-webhooks
│       └── public/          bmi-public
├── bmi-university/      → Next.js 16 marketing site, Cloudflare Pages — OUTSIDE the main
│                            npm/pnpm dependency graph conceptually but IS listed in root
│                            workspaces (see README vs. reality note below)
├── packages/
│   ├── shared/           → @bmi/shared — types, constants, ALLOWED_ORIGINS, program lists
│   ├── api-middleware/    → @bmi/api-middleware — auth, CORS, rate-limit, logging, cache
│   └── rate-limiter/      → @bmi/rate-limiter — a SECOND rate-limiter, used only by apps/workers/*
├── docs/
│   ├── ARCHITECTURE.md, RUNBOOK.md, cache.md, database-migrations.md
│   └── audits/            → 9 pre-existing audit/status documents (see §11)
├── terraform/            → Cloudflare IaC (KV namespace only; DNS/routes are not in Terraform)
├── load-tests/            → single k6 script
├── images/                → 11MB of static marketing assets committed to git (see §11)
├── audit.md               → a low-fidelity, self-admittedly "inferred" AI-generated audit sitting
│                            at repo root (see §11) — not to be confused with this document
└── package.json           → workspaces: ["apps/*", "apps/workers/*", "packages/*", "bmi-university"]
```

**Scale:** ~67,800 lines of application TS/TSX/JS/JSX (excluding tests, generated output, `node_modules`). 138 commits, single contributor (`KIAI-JOSEPH`), no root `LICENSE` file (one exists inside `bmi-university/` and `apps/ums/` individually, which is itself inconsistent).

**Structural finding:** the README's diagram (`apps/workers/ → Cloudflare Workers (auth, ums, core, webhooks, public)` as the entire backend) already describes the *intended* end-state architecture, not what's deployed. `apps/api` — the actual monolith serving all live traffic — isn't even mentioned in the README's structure diagram. This is a real gap between what a new contributor would read and what's actually running (see §2.2, §11).

---

## 2. Architecture Assessment

### 2.1 What's genuinely good
- Serverless edge-native design (Workers + D1 + R2 + Queues) is a reasonable fit for a low-traffic institutional SIS on a cost-constrained budget.
- A `WriteQueue` Durable Object was correctly identified and built to serialize D1 writes and avoid `SQLITE_BUSY` under concurrent load (`apps/workers/auth/lib/WriteQueue.ts`, tested).
- Clean separation of `@bmi/shared` (types/constants) from `@bmi/api-middleware` (cross-cutting concerns) is a sound monorepo pattern.
- CI path-filtering (`dorny/paths-filter`) means a change to `apps/portal` doesn't trigger redeploys of unrelated workers — good incremental-deploy hygiene.

### 2.2 The split-worker migration is live in code, dead in production — this is the single biggest architectural risk in the repo

Commits from July 6, 2026 ("Phase 2 – Step 1" through "Step 5") extracted the `apps/api` monolith into five domain-specific Workers (`bmi-auth`, `bmi-core`, `bmi-ums`, `bmi-webhooks`, `bmi-public`), each with its own `wrangler.jsonc` and its own slice of `api.hkmministries.org` routes. `docs/ARCHITECTURE.md` presents this as the *current* system:

> "The monolith API was decoupled into domain-specific workers using Cloudflare DNS routing..."

I traced where the frontends actually point:

```
# .github/workflows/deploy.yml — deploy-portal and deploy-ums jobs
VITE_API_URL: "https://bmi-api.bmiuniversity107.workers.dev"
```

```ts
// apps/ums/src/services/config.ts
((import.meta as any).env.VITE_API_URL || DEFAULT_API_URL) + '/api/v1';
```

`bmi-api.bmiuniversity107.workers.dev` is the **monolith's** default `workers.dev` subdomain — not `api.hkmministries.org`, where the new domain workers' `routes` blocks are configured. A Worker's `workers.dev` subdomain always serves whatever is in that Worker's own script, regardless of any `routes` zone-config — so this isn't a routing nuance, it's a hard fact: **both production frontends call the old monolith exclusively.** I confirmed `apps/api/index.ts` still registers all ~95 routes (auth, applications, documents, admin, every UMS resource) — the comment in its own `wrangler.jsonc` claiming it "retains only paths NOT owned by a domain worker: `/api/health`... All other paths are handled by domain-worker routes below" does not match the code one file below it.

**Consequences:**
- Every hardening feature built in Phase 2 — the WriteQueue DO, the `cpu_ms`/`max_concurrent_requests` limits, the new structured JSON logging — protects zero real requests today.
- `apps/workers/core/routes/apply.ts` and `apps/api/routes/apply.ts` are **already different implementations of the same feature.** I diffed them: the monolith version enforces a configurable max-applications-per-user limit and an application deadline; the `bmi-core` fork does neither (it does independently validate `degree_level` inline, which the monolith delegates to a Zod schema — so behavior, not just formatting, has diverged in both directions in under 48 hours). Every day this continues, the two implementations drift further apart, and whichever one eventually goes live will silently reintroduce bugs already fixed in the other.
- This is a real, current maintenance tax: any bug fix or feature now needs to be applied twice (or it will not be applied at all to whichever fork isn't live), and nobody reading `ARCHITECTURE.md` alone would know which one that is.

**Recommendation:** this needs a decision, not more code. Either (a) finish the cutover — repoint `VITE_API_URL` at `api.hkmministries.org`, delete `apps/api`'s route table down to `/api/health` + cron as the comment already claims, and make `apps/workers/*` the source of truth — or (b) delete `apps/workers/*` entirely and revert to treating the monolith as the real system until there's bandwidth to redo the split properly. Leaving both alive and diverging is the worst of the three options.

### 2.3 Secondary architecture notes
- Two independent rate-limiter implementations exist (`packages/api-middleware/src/rate-limit.ts`, used by the monolith; `packages/rate-limiter`, used by `apps/workers/*`) — another instance of the fork pattern above, on a security-relevant code path.
- `terraform/main.tf` only manages a single KV namespace; the actual DNS routes that the entire domain-worker design depends on live nowhere in version control (configured by hand in the Cloudflare dashboard, presumably) — meaning the most architecturally significant part of the "Phase 2" design has no infrastructure-as-code trail at all.

---

## 3. Code Quality

**Score: B− (72/100)**

| Signal | Result |
|---|---|
| `tsc --noEmit` (apps/api) | ✅ clean |
| `tsc --noEmit` (apps/ums) | ✅ clean |
| `eslint .` (apps/api) | ✅ clean, zero warnings |
| `next build` (bmi-university) | ✅ clean, 8.9s |
| `: any` / `as any` occurrences (apps/api only) | 96 |
| Largest files | `documentService.ts` 1,039 lines, `grading/types.ts` 683, `auth.ts` (monolith) 599, `auth.ts` (bmi-auth fork) 589, `performance.ts` 558 |
| TODO/FIXME/HACK markers | 15 |

The code that exists is generally readable, consistently formatted, and uses parameterized SQL everywhere I checked (no string-concatenated queries found). The router in `apps/api/index.ts` is a hand-rolled regex-based dispatcher rather than a framework like Hono or itty-router — functional, well-organized for ~95 routes, but a 337-line file that will get harder to scan as routes are added; adopting a real router would cost little and pay for itself.

96 `any`/`as any` escapes in one app is on the high side for a codebase that otherwise takes typing seriously (Zod schemas, typed `Env`, typed route handlers) — worth a follow-up pass, especially in the auth/request-handling hot path where a wrong `any` is most costly.

---

## 4. Security Assessment

**Score: B (confirmed real fixes; a few new/recurring gaps)**

### 4.1 Confirmed fixed since prior audits (verified by reading current code, not changelog)
- **Student-profile IDOR** (`apps/api/routes/ums-students.ts:79-87`) — explicit ownership check before returning another student's record, tagged `// SECURITY:`.
- **Grades IDOR** (`apps/api/routes/ums-grades.ts:30-33`) — a student-supplied `studentId` filter is overwritten with the caller's own ID when `callerRole === 'student'`.
- **Email-verification login bypass** — `handleLogin` (`apps/api/routes/auth.ts:221-223`) now hard-rejects unverified accounts before password check even completes downstream logic.
- **Ungated CI deploys** — every `deploy-*` job in `.github/workflows/deploy.yml` now has `needs: [changes, test, ...]`, and `contract-tests` is a hard, non-`continue-on-error` gate.
- **Orphaned `bmi-portal` git submodule** — no `.gitmodules` file exists; this is fully gone.
- **0 known dependency vulnerabilities** — verified live via `npm audit --audit-level=low` against the current lockfile (1,266 packages).

### 4.2 Genuinely strong, unprompted
- CORS is allow-list based (not a wildcard/reflect-any-origin pattern), and `withCors()` (`packages/api-middleware/src/cors.ts`) attaches a real security header set: CSP, HSTS w/ preload, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, restrictive `Permissions-Policy`.
- Webhook ingress verifies an HMAC signature (`X-BMI-Signature`) before processing (`apps/api/routes/webhooks.ts:25-30`).
- Passwords use PBKDF2-SHA256 with per-password random salts and a server-side pepper, not a weaker hash — sound choice of primitive even though the iteration count has a platform-fit problem (§6.1).
- CSRF tokens are validated on all state-changing requests outside a short, sensible exemption list (login/register/password-reset, where no session cookie exists yet).
- CI runs Trivy (SARIF → GitHub Security tab), Gitleaks secret scanning, and a hard-failing `npm audit --audit-level=high` on every push and weekly on schedule.

### 4.3 New/recurring findings
- **CORS allow-list hardcodes ephemeral preview URLs.** `apps/api/wrangler.jsonc`'s `ALLOWED_ORIGINS_OVERRIDE` includes literal hash-prefixed URLs like `https://8b1de1e8.bmi-portal-7oo.pages.dev`. Cloudflare Pages generates a new hash per preview deployment, so this value goes stale on the very next preview build — the exact class of bug a prior audit already flagged as fixed; it has resurfaced via hardcoding rather than being solved generally.
- **Account/email enumeration.** `handleLogin` checks `!user.is_verified` (returning a distinct "please verify your email" message) *before* verifying the password. An attacker can distinguish "account doesn't exist," "account exists, unverified," and (via timing/generic message) "account exists, verified" — three distinguishable states from one endpoint. Low severity, real information leak.
- **`dangerouslySetInnerHTML` in `apps/portal/src/pages/Login.tsx:64`**, rendering API-derived error text as raw HTML. Currently safe in practice because every message reaching this component today is a fixed server-side string, but there's no sanitization and no barrier stopping a future error path from echoing user input into this same field. Recommend replacing with a proper `<Link>`/JSX construction instead of a string-concatenated `<a>` tag.

---

## 5. Performance Analysis

### 5.1 PBKDF2 iteration count likely exceeds the Workers Free-plan CPU budget — empirically measured, not assumed

`apps/api/lib/jwt.ts:71` hashes passwords with `iterations = 100000` (PBKDF2-SHA256). Cloudflare's current published limit for the Workers **Free** plan is **10ms of CPU time per invocation** (confirmed via Cloudflare's own docs, checked live for this review). I benchmarked the identical WebCrypto call (`crypto.subtle.deriveBits` with the same algorithm/iteration count) locally:

```
PBKDF2 100k iterations, 5 runs: [20.54ms, 17.25ms, 17.40ms, 17.57ms, 17.06ms]
```

This isn't Cloudflare's exact isolate, so treat it as directional rather than exact — but it's consistently **~1.7–2x** the 10ms budget, using the same crypto primitive Workers exposes. If this account is on the Free plan (the repo's own `docs/audits/BMI-SYSTEM_Cloudflare_FreeTier_Optimization.md` is written entirely around free-tier constraints, suggesting it is), every login, registration, and password-reset call is at meaningful risk of `Error 1102` (CPU limit exceeded) — the single most-used code path in the entire application. A prior commit ("reduce PBKDF2 iterations to 100k... CF Workers limit") suggests this was already identified and "fixed" once; 100k still doesn't fit under a 10ms ceiling by this measurement, and if the plan is actually Paid (default 30s budget), this whole finding is moot — worth a five-minute confirmation either way, because the fix is trivial once known (see §14.2) and the failure mode if wrong is "no one can log in."

### 5.2 Rate limiting adds a synchronous D1 write to every single request
`packages/api-middleware/src/rate-limit.ts` performs an `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` against D1 **before any business logic runs**, on every request, for every endpoint. This adds D1 round-trip latency to the hot path unconditionally, and — worse — it happens **outside** the WriteQueue Durable Object that the architecture doc says exists specifically to prevent D1 write contention. Under any real concurrent load, rate-limit bookkeeping competes with genuine business writes for the same D1 write serialization, on literally every request. See §6 for the quota implication.

### 5.3 What's done well
- Migration `0014_performance_indexes.sql` and the base schema show real indexing discipline — every foreign-key-style lookup I checked (`enrollments.student_id`, `grades.enrollment_id`, `applications.user_id`, `sessions.user_id/expires_at`) has a matching index.
- `apps/api/lib/performance.ts` (558 lines) implements batched/optimized write paths for application submission (`executeAdmissionPipelineOptimized`) — real, non-trivial performance engineering, not just a name.
- Cache-Control headers with configurable TTL are applied per-route (`cacheTTL` field in the route table) for cacheable public endpoints.

---

## 6. Scalability Review

Given the explicit Cloudflare-free-tier framing throughout the repo's own docs, quota exhaustion — not raw throughput — is the real scalability ceiling here:

| Resource (Free plan) | Published limit | What consumes it |
|---|---|---|
| D1 rows written/day | 100,000 | Every request (rate-limit upsert) **+** every real business write |
| Worker CPU time/request | 10ms | PBKDF2 login/register/reset (see §5.1) |
| Worker requests/day | 100,000 | All traffic across every worker |

The rate-limiter writing to D1 on *every* request (§5.2) means the "business" D1 write budget is being taxed by infrastructure bookkeeping on every single call, not just mutating ones — this halves the effective daily ceiling for real work well before any of the domain-specific numbers in the repo's own free-tier analysis doc are reached. Moving rate-limit counters to something that doesn't consume the same shared write budget (in-memory-per-isolate with a short TTL, or a dedicated low-cost store) would meaningfully extend runway without an architecture change.

The WriteQueue DO is a correct scalability primitive for the D1 concurrent-write ceiling — but again, only for the workers that receive traffic (see §2.2). As deployed today, the component that actually serves 100% of requests (`apps/api`) has zero write serialization and writes directly to D1 in every route handler I checked.

---

## 7. Maintainability Score

**Score: C+**

The core drag on maintainability isn't code style (which is clean) — it's the **duplicated, independently-evolving implementation** created by the incomplete split-worker migration (§2.2). Two rate limiters, two copies of the applications/admin/documents/CMS/recommendations logic, and two `wrangler.jsonc` configs per concern is real, measured technical debt that will compound with every commit until one side is retired. Outside of that:
- Large single-purpose files (`documentService.ts` at 1,039 lines) would benefit from splitting by responsibility.
- 96 `any` escapes in one app reduce the value of an otherwise well-typed codebase for future refactors — type errors that should be caught at compile time will instead surface at runtime.
- Nine separate audit/status markdown files in `docs/audits/` plus a tenth (`audit.md`) at repo root, several of which are now stale or partially superseded, create real "which document is current" friction for anyone joining the project (see §11).

---

## 8. Technical Debt Analysis

| Item | Origin | Cost if left unaddressed |
|---|---|---|
| Monolith/split-worker fork (§2.2) | Incomplete Phase 2 migration | Compounding behavioral drift; eventual production incident when someone cuts over without reconciling the forks |
| Blank transcript/GPA (§9, §14.1) | Grades table added without wiring the read path | Every day live is a day of silently wrong (empty) academic records |
| Mock payment gateway | Never implemented past a stub | Blocks any real tuition collection; currently invisible to users because it always "succeeds" |
| Duplicate rate-limiters | Same split as above | Two security-relevant implementations to keep in sync |
| Migration `0014` filename collision (`0014_add_email_logs.sql` / `0014_performance_indexes.sql`) | Uncoordinated migration authorship | Not currently breaking (Wrangler tracks by filename, not number) but risks a future real collision and signals no migration-numbering convention is enforced |
| 96 `any` escapes | Fast iteration under time pressure | Runtime type errors that TypeScript should have caught |
| No root `LICENSE`, inconsistent per-package licensing | Never established | Ambiguous terms for a public GitHub repo |

---

## 9. Dependency Review

**Score: A−**

- `npm audit --audit-level=low` against the live lockfile: **0 vulnerabilities**, 1,266 packages resolved (verified live, not from a changelog claim).
- Framework versions are current: React 19.2.7, Next.js 16.2.10, TypeScript 5.8.2 (api) / consistent across workspaces, Vitest 4.1.9, Wrangler ^4.107.0.
- `.github/dependabot.yml` is thoughtfully configured: weekly cadence, grouped patch/minor updates for the Cloudflare and React ecosystems (reduces PR noise), and a deliberate `ignore` rule holding back Next.js major-version bumps for manual review — a mature choice given Next's history of breaking edge-runtime changes.
- Minor gap: no `engines` field in any `package.json` pinning the Node version, despite CI standardizing on Node 24 — a contributor on an older local Node version could hit subtle, hard-to-diagnose failures that CI won't.

---

## 10. Testing Quality

**Score: D+** — the weakest area of the codebase, and directly responsible for §14.1 shipping undetected through many "fix:" commits.

```
apps/api/routes/: 21 non-test modules, 5 have any test coverage (24%)
Untested: admin.ts, cms.ts, performance.ts, programmes.ts, public.ts,
          recommendations.ts, ums-collections.ts, ums-courses.ts,
          ums-dashboard.ts, ums-finance.ts, ums-grades.ts, ums-rubrics.ts,
          ums-staff.ts, ums-stats.ts, ums-timetabling.ts, webhooks.ts
```

The 57 tests that exist (8 files, all passing — verified by running `vitest run` live) are well-written where they exist: proper mocking of `D1Database`/`WRITE_QUEUE` bindings, real assertion coverage of both happy and error paths in `auth.test.ts` and `documents.test.ts`. The problem is coverage breadth, not quality. Critically, **`ums-grades.ts` — the module that writes the data the transcript is supposed to read — has zero tests**, and neither does the transcript-reading code in `student.ts`. A single integration test asserting "a grade recorded via the API appears in the student's transcript" would have caught §14.1 the day it was introduced.

Frontend coverage is proportionally better: `apps/ums` has 21 test files across 129 source files plus 7 Playwright e2e specs; `apps/portal` has 6 test files across 25 source files. Both `type-check` and their respective test suites pass cleanly as of this commit.

---

## 11. Documentation Review

**Score: C**

Real, substantive docs exist — `docs/RUNBOOK.md` (on-call triage), `docs/cache.md`, `docs/database-migrations.md` — and they read as written by someone who actually operates this system, not boilerplate. That's a genuine strength.

Two concrete problems:
1. **`docs/ARCHITECTURE.md` documents the aspirational end-state as the current state.** Its "Domain Worker Topography" and "DNS Routes" sections describe the split-worker design as already decoupled and live; §2.2 shows it isn't. This is the most consequential doc/reality gap in the repo because it's the document most likely to be read first by a new contributor or another audit.
2. **`audit.md` at repo root is a low-fidelity, non-verified document that shouldn't be there in its current form.** It literally states its own repository structure section is *"inferred"* from the README rather than read from the actual tree, and the structure it infers (`apps/bmi-auth/`, `apps/bmi-frontend/`, etc.) doesn't match the real layout at all. Sitting at repo root with a generic filename, it's easy to mistake for authoritative. Recommend either deleting it or moving it into `docs/audits/` with a header clearly marking it as an early, unverified draft — which is effectively what the README's disclaimer on `docs/audits/` already tries to do for the *other* nine documents, just not this one.
3. Minor: multiple docs (including audit docs) reference `apps/api/db/schema.sql`; no such path exists — schema is defined purely through `apps/api/migrations/*.sql` now, and nothing in `docs/database-migrations.md` was updated to match.

Repo hygiene note, tangential to documentation: `images/` (11MB, including a full PDF academic catalog) is committed directly to git history despite a commit already titled "aggressively optimize all images to reduce repository size" — the underlying pattern (large static marketing assets in the app monorepo rather than R2/Pages assets or Git LFS) wasn't changed, just compressed.

---

## 12. Prioritized Findings

### 🔴 Critical
1. **Transcripts and GPA are permanently blank for every student.** `handleGetTranscript` (`apps/api/routes/student.ts:117-121`) reads `enrollments.grade`, a column nothing in the codebase ever writes. Real grades live in the `grades` table (`apps/api/routes/ums-grades.ts`), which the transcript query never joins. Verified via full write-path search — zero results for any `UPDATE enrollments ... SET grade`. *(Fix: §14.1)*
2. **Password hashing (100k PBKDF2 iterations) empirically measured at ~17–20ms, exceeding the Cloudflare Workers Free-plan 10ms CPU budget by ~2x** on every login/register/password-reset call — the highest-traffic code path in the app. *(Fix: §14.2)*
3. **Payment processing is an unintegrated mock** (`apps/api/routes/student.ts:97`, `// Mock payment gateway: Just mark it as paid`) — no gateway call exists anywhere in the codebase; invoices report "paid" with no real transaction behind them.

### 🟠 High
4. **The Phase 2 domain-worker split is architecturally live but operationally dead** — frontends exclusively call the old monolith (`bmi-api.bmiuniversity107.workers.dev`), not the new workers' `api.hkmministries.org` routes. The new workers already contain diverging forked business logic (verified via diff of `apply.ts`). Needs a cutover decision, not more code (§2.2).
5. **Only 24% of API route modules have any test coverage**, and the two modules tied to Critical Finding #1 (`ums-grades.ts`, transcript logic in `student.ts`) are both untested. This is the root cause enabling #1 to survive dozens of "fix:" commits undetected.
6. **Rate limiting writes to D1 on every request, unprotected by the WriteQueue DO**, on the exact code path (every single request) most likely to trigger the `SQLITE_BUSY` contention the DO exists to prevent, while also consuming the shared D1 write quota faster than any legitimate business feature.

### 🟡 Medium
7. CORS allow-list hardcodes ephemeral, hash-prefixed Pages preview URLs that go stale on the next preview deploy.
8. Migration filename collision: `0014_add_email_logs.sql` / `0014_performance_indexes.sql` share a sequence number.
9. Login flow allows email/account enumeration via distinguishable error states (verified-vs-unverified-vs-nonexistent).
10. `dangerouslySetInnerHTML` used for API-derived text in `Login.tsx` with no sanitization layer.
11. `docs/ARCHITECTURE.md` presents the unwired split-worker topology as the current deployed system.
12. Root-level `audit.md` is a self-admittedly inferred, unverified document that could be mistaken for ground truth.

### 🟢 Low
13. 96 `any`/`as any` type escapes in `apps/api` alone.
14. Several 500+ line "god files" (`documentService.ts` at 1,039 lines) are refactor candidates.
15. No `engines` field pinning Node version despite CI standardizing on Node 24.
16. Stale documentation references to a `apps/api/db/schema.sql` path that no longer exists.
17. No root `LICENSE`; licensing is inconsistently scoped to individual sub-packages.

---

## 13. Refactoring Roadmap

**Week 1 — stop the bleeding (Critical items, each is genuinely small):**
- Fix the transcript/GPA query to read from `grades` (§14.1). Add the one integration test that would have caught this.
- Confirm the Cloudflare plan tier; if Free, reduce PBKDF2 iterations to fit the 10ms budget or move hashing off the request-serving isolate (§14.2). Add a CI check that fails the build if password-hashing CPU cost regresses.
- Either wire a real payment gateway (M-Pesa/Pesapal/Flutterwave per the payment integration plan already drafted) behind the existing invoice endpoint, or clearly label the current flow as a sandbox/demo mode in the UI so no one mistakes it for real billing.

**Weeks 2–3 — resolve the architecture split (High #4):**
- Decide: finish the Phase 2 cutover, or roll it back. If finishing: repoint `VITE_API_URL` at `api.hkmministries.org`, reconcile the diverged `apply.ts` business logic (max-applications-per-user, deadline enforcement) into whichever version wins, trim `apps/api/index.ts` down to the health/cron routes its own config comment already claims, and delete the losing rate-limiter package.
- Move rate-limit bookkeeping off the shared D1 write budget (§14.3 has an isolate-local alternative).

**Weeks 3–4 — close the testing gap (High #5):**
- Prioritize test coverage for `ums-grades.ts`, `ums-finance.ts`, `admin.ts`, and `webhooks.ts` — highest blast-radius, currently zero coverage.
- Add one end-to-end "submit grade → appears correctly in transcript → GPA computed correctly" test as a permanent regression guard.

**Ongoing / opportunistic:**
- Reduce `any` usage incrementally as files are touched rather than as a dedicated sprint.
- Split `documentService.ts` and similar large files along responsibility lines the next time either is modified for a feature.
- Consolidate `docs/audits/` into a single "current known issues" doc plus a `historical/` folder for superseded reports, and delete or clearly relabel `audit.md`.

---

## 14. Suggested Code Changes

### 14.1 Fix the blank transcript/GPA (Critical #1)

The transcript endpoint needs to read from `grades`, not the never-written `enrollments.grade`. The exact grade-computation policy (simple average of assessment percentages vs. weighted by assessment type) is a product decision I can't make on your behalf — the schema currently has no `weight` column on `grades`, so a simple average is the most defensible illustrative fix without a schema change:

```ts
// apps/api/routes/student.ts — handleGetTranscript
export async function handleGetTranscript(request: Request, env: Env, userId: string): Promise<Response> {
  const { results: classes } = await env.DB.prepare(
    `SELECT c.code, c.title, c.credits, c.term, e.id as enrollment_id, e.status,
            (SELECT AVG(g.score * 100.0 / g.max_score)
               FROM grades g WHERE g.enrollment_id = e.id) as avg_pct
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     WHERE e.student_id = ? AND e.status != 'waitlisted'
     ORDER BY c.term DESC, c.code ASC`
  ).bind(userId).all();

  function pctToLetter(pct: number | null): string | null {
    if (pct === null) return null;
    if (pct >= 93) return 'A';  if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+'; if (pct >= 83) return 'B';  if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+'; if (pct >= 73) return 'C';  if (pct >= 70) return 'C-';
    if (pct >= 67) return 'D+'; if (pct >= 60) return 'D';
    return 'F';
  }

  const gradePoints: Record<string, number> = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0,
  };

  let totalPoints = 0, totalCredits = 0;
  const withGrades = (classes as any[]).map((c) => {
    const grade = pctToLetter(c.avg_pct);
    if (grade && gradePoints[grade] !== undefined) {
      totalPoints += gradePoints[grade] * c.credits;
      totalCredits += c.credits;
    }
    return { ...c, grade };
  });

  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : null;
  return ok({ classes: withGrades, gpa });
}
```

This is illustrative, not a drop-in — confirm the letter cutoffs and averaging policy against your institution's actual grading standard before shipping. Whatever the final formula, add the regression test described in §13 so this can't silently regress again.

### 14.2 Bring password hashing under the CPU budget (Critical #2)

If the account is confirmed to be on the Free plan, the fastest safe fix is lowering iterations to a value that empirically fits under 10ms with margin, while keeping a per-user pepper and a strong random salt to compensate:

```ts
// apps/api/lib/jwt.ts
const iterations = 40000; // re-benchmark against your actual Workers isolate, not just locally
```

Re-run a benchmark identical to the one in §5.1 against an actual deployed Worker (not just locally) before picking a final number — local WebCrypto timing is a proxy, not a guarantee, for Workers' isolate. If the account is confirmed Paid (30s default budget), this finding is moot and 100k iterations is a reasonable, defensible choice — that confirmation is a five-minute check worth doing before touching this code.

### 14.3 Take rate-limit bookkeeping off the shared D1 write budget (High #6)

An isolate-local, best-effort counter avoids the per-request D1 write entirely for the common case, falling back to D1 only when a limit is actually approached — trading perfect cross-isolate accuracy (rate limiting is inherently approximate at the edge anyway) for a large reduction in write volume:

```ts
// packages/api-middleware/src/rate-limit.ts
const localCounts = new Map<string, { count: number; windowStart: number }>();

export async function rateLimit(request: Request, db: D1Database, maxRequests = 30): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const endpoint = new URL(request.url).pathname;
  const key = `${ip}:${endpoint}`;
  const windowStart = Math.floor(Date.now() / 60000);

  const entry = localCounts.get(key);
  if (entry && entry.windowStart === windowStart) {
    entry.count++;
    if (entry.count > maxRequests) return errorResponse('Rate limit exceeded. Please try again later.', 429);
    return null; // no D1 write in the common case
  }
  localCounts.set(key, { count: 1, windowStart });
  return null;
}
```

Note this trades cross-isolate precision for write-budget headroom — a determined attacker distributing requests across isolates gets more effective throughput than the nominal limit suggests. For this application's actual threat model (an institutional SIS, not a public high-value API), that tradeoff is very likely worth it; flagging it explicitly so it's a chosen tradeoff rather than an accidental one.

---

## 15. Summary Scorecard

| Category | Score | Direction since last audit |
|---|---|---|
| Code Quality | B− | — |
| Security | B | ↑ (3 real fixes confirmed; 2 new minor issues found) |
| Performance | C+ | — (PBKDF2 issue persists despite a fix attempt) |
| Scalability | C | — |
| Maintainability | C+ | ↓ (new fork debt from Phase 2) |
| Technical Debt | C | ↓ (new fork debt from Phase 2) |
| Dependencies | A− | ↑ (0 vulnerabilities, confirmed live) |
| Testing | D+ | — (still the root cause enabling Critical #1) |
| CI/CD | A− | ↑ (deploys now gated; strong security scanning) |
| Documentation | C | ↓ (ARCHITECTURE.md now describes a state that doesn't exist) |
| **Overall** | **C+** | Real progress on security and CI; one severe data-integrity bug still open, and the new microservice split has created more risk than it's currently delivering value. |
