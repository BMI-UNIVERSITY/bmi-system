# BMI-System: Cloudflare Free-Tier Longevity & Optimization Research

**Goal:** identify every place the current `bmi-system` code/config will burn through Cloudflare's free-tier quotas faster than necessary, and what to change — ranked by which limit you'll actually hit first.
**Method:** verified current (June 2026) free-tier limits against Cloudflare's own docs and three independent third-party trackers, then traced every Worker/KV/D1/R2/Pages touchpoint in the actual `bmi-system` code to see how each limit gets consumed in practice.

---

## 0. The headline finding

You will **not** run out of Workers requests, D1 reads, or R2 storage first. You will run out of **KV writes** first — by a wide margin — because every login writes to KV, and KV's free tier allows only **1,000 writes/day**, vs. 100,000 requests/day on Workers and 5,000,000 row-reads/day on D1. The system currently has no fallback for this. The second thing you'll hit is **Worker CPU time**, because the password-hashing code (100,000 PBKDF2 iterations) takes roughly **10x longer than the entire free-tier CPU budget per request** — this isn't a future risk, it's a likely-already-occurring failure mode on login/register under any real traffic. Both are fixable without touching the rest of the architecture.

## 1. Verified current Cloudflare free-tier limits (June 2026)

| Resource | Free tier limit | Source |
|---|---|---|
| Workers requests | 100,000/day | Cloudflare docs; confirmed by 2 independent trackers |
| Workers CPU time | 10 ms / invocation (average Worker uses ~2.2ms; "heavier" auth/SSR workloads typically 10-20ms per Cloudflare's own docs) | developers.cloudflare.com/workers/platform/limits |
| Workers subrequests | 50 external fetch() calls per invocation (1,000 to Cloudflare services) | developers.cloudflare.com |
| Worker script size | 3 MB | BetterLink tracker |
| KV storage | 1 GB | Cloudflare docs |
| KV reads | 100,000/day | Cloudflare docs |
| KV writes | **1,000/day** | Cloudflare docs |
| KV deletes | 1,000/day | Cloudflare docs |
| KV list ops | 1,000/day | Cloudflare docs |
| D1 storage | 5 GB | Cloudflare docs |
| D1 rows read | 5,000,000/day | Cloudflare docs |
| D1 rows written | 100,000/day | Cloudflare docs |
| R2 storage | 10 GB-month | Cloudflare docs |
| R2 Class A ops (writes/lists) | 1,000,000/month | Cloudflare docs |
| R2 Class B ops (reads) | 10,000,000/month | Cloudflare docs |
| R2 egress | Unlimited, $0 (no egress fees on any tier) | Cloudflare docs |
| Pages builds | 500/month | Cloudflare docs |
| Pages files per deployment | 20,000 | Cloudflare docs |
| Pages bandwidth/requests | Unlimited | Cloudflare docs |
| Cron Triggers | Included free, no separate cap | Cloudflare docs |

The KV write ceiling (1,000/day) is **100x tighter** than the Workers request ceiling (100,000/day) and **100x tighter** than D1 writes (100,000/day). Any design that ties a KV write to a high-frequency user action (like "every login") will exhaust its daily quota orders of magnitude before any other resource is touched.

---

## 2. Workers — the CPU-time problem (this is the real one)

### 2.1 PBKDF2(100,000 iterations) does not fit in the free-tier CPU budget

`apps/api/lib/jwt.ts`:
```ts
const hashBuffer = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
  keyMaterial,
  256
);
```
This runs on **every** register, login, password-reset, and admin-reset-password request (`routes/auth.ts`, `routes/admin.ts`). Independently-documented real-world testing of the identical pattern (PBKDF2-SHA256, 100k iterations, WebCrypto, on a Cloudflare Worker) shows it consumes **~100ms of CPU time** — roughly **10x** the free tier's per-invocation CPU budget. This is consistent with Cloudflare's own framing that "heavier workloads... typically use 10-20 ms" being the upper end of *normal*; 100ms is a different order of magnitude. Workers gives some tolerance for occasional overage, but a Worker that *consistently* exceeds its configured CPU limit gets terminated with **Error 1102 ("Worker exceeded resource limits")** — meaning under real traffic, a meaningful fraction of login/register/reset-password requests on the free tier are likely already failing or will start failing as soon as traffic isn't trivially small. This is not a capacity-planning concern for "later" — it's close to a live correctness bug today.

This is a genuine security-vs-budget tension, not a simple bug: OWASP's 2023 guidance recommends 600,000 PBKDF2-SHA256 iterations as a *minimum* for password storage, while community tracking of Workers shows the *runtime itself* caps PBKDF2 at 100,000 iterations outright (`NotSupportedError: iteration counts above 100000 are not supported`) — so even if CPU budget were unlimited, you can't dial this up to OWASP's recommended floor on Workers at all, paid or free. Projects built specifically for edge runtimes (e.g., `pbkdf2-lite`) explicitly recommend 20,000–80,000 iterations as the practical range for the Workers Free CPU budget.

**Recommendation (tiered):**
- **Now, free tier:** Drop iterations to ~40,000–60,000. This roughly halves-to-quarters CPU time, bringing it close to or under the 10ms window, at the cost of being below OWASP's ideal — document this explicitly as an accepted, deliberate tradeoff (not a silent regression) and revisit if/when you move to Paid.
- **Alternative, same cost:** Switch from PBKDF2 to HMAC-based password storage isn't a real security improvement; a better edge-native option is to keep PBKDF2 but reduce iterations *and* add a per-deployment secret pepper (HMAC the password with a server-side secret before PBKDF2), which buys back security margin lost to lower iterations without adding proportional CPU cost (one HMAC op is cheap relative to PBKDF2 itself).
- **If you upgrade to Workers Paid ($5/mo):** you get a much larger CPU budget (this is the one limit that's genuinely worth paying $5 to fix rather than re-engineering around, since it directly trades off against password security, which is the wrong place to cut corners). At that point you can move toward the OWASP-recommended end of PBKDF2, still capped by the runtime's hard 100,000-iteration ceiling — so even Paid doesn't get you to OWASP's 600k recommendation; consider Argon2id via a WASM build if you need to go further, accepting that WASM crypto has its own CPU cost on Workers and would need the same budget analysis repeated.

### 2.2 No `ctx.waitUntil()` — background work isn't guaranteed to finish, and may be silently re-run
`apps/api/index.ts`'s exported handler signature is:
```ts
async fetch(request: Request, env: Env): Promise<Response> {
```
It does not accept or thread through `ctx: ExecutionContext` at all. Meanwhile `routes/apply.ts` fires a webhook as fire-and-forget after constructing the response:
```ts
dispatchWebhook(env, 'application.status_changed', { ... }).catch(() => {});
```
`dispatchWebhook` includes up to 3 retries with delays of 1s/4s/16s (~21+ seconds of wall time). Cloudflare's documented, supported pattern for "work that should keep running after the response is sent" is `ctx.waitUntil(promise)` — without it, the runtime is free to tear down the invocation's I/O context once the response is returned, and there's no guarantee the retry delays/backoff in `lib/webhook.ts` ever complete. **This isn't currently costing you free-tier quota directly, but it likely means your carefully-built dead-letter/retry system silently under-delivers, which in turn means more *manual* retries via the admin "Retry Dead Letter" endpoint than you'd otherwise need** — each manual retry is its own Worker invocation, KV/D1 touch, and (if it also isn't wrapped in `waitUntil`) repeats the same risk. **Fix:** add `ctx: ExecutionContext` to the `fetch` signature and wrap every fire-and-forget call (`dispatchWebhook(...).catch(() => {})`, the inbound-webhook logging `.catch(() => {})`) in `ctx.waitUntil(...)`. This is free — it doesn't consume any additional quota, it just makes the quota you already spend actually count.

### 2.3 Worker request budget itself is comfortably sized today, but is shared across more than people assume
The 100,000 requests/day Workers limit is shared by **every caller** of `apps/api` — that's `apps/portal`, `apps/ums`, **and** `bmi-university`'s build-time/SSR fetches (`lib/portalApi.js` calls `/api/public/programs`, `/api/public/stats`, `/api/public/cms/posts` on every relevant page render or build). Static-export pages (see §5) only hit the Worker at *build time*, which is cheap, but if this is ever switched to SSR/ISR on Pages Functions (a tempting "fix" for the ISR confusion noted in §5), every visitor page-load would also count against this same 100k/day budget. **Recommendation:** keep `bmi-university` as a static export (it already is — see §5) specifically *because* it keeps marketing-site traffic off the Worker's request budget entirely; don't "fix" the ISR comment by actually enabling SSR without re-budgeting this limit.

---

## 3. KV — the tightest real constraint in the system

### 3.1 Quantified: session-on-login design exhausts the write quota first
Confirmed call sites (`apps/api/routes/auth.ts`):
```ts
await env.SESSIONS.put(`session:${user.id}`, '1', { expirationTtl: 60 * 60 * 24 * 7 });  // login (line 203)
await env.SESSIONS.delete(`session:${payload.sub}`);                                       // logout (line 236)
await env.SESSIONS.delete(`session:${resetToken.user_id}`);                                // password reset (line 331)
await env.SESSIONS.put(`session:${user.id}`, '1', { expirationTtl: 60 * 60 * 24 * 7 });  // OAuth login (line 471)
```
Every login (password or OAuth) is **1 KV write**. The free tier allows **1,000 writes/day total**, shared across both the Portal and UMS frontends and every role (applicants, students, staff, admins). For a university with, say, 300 active students each logging in once a day on average, plus staff/admin sessions, plus any session refresh behavior on the frontend (re-login after token expiry, multiple devices), **1,000 writes/day is a plausible, not hypothetical, ceiling** — especially concentrated around registration periods, exam result release days, or the start of a term when login volume spikes. Once exceeded, `env.SESSIONS.put()` calls will start failing for the rest of the day, and since `requireAuth` in `middleware/auth.ts` treats "session not found in KV" as `401 Session expired. Please log in again`, **the failure mode is that new logins silently stop being able to authenticate** on the busiest days of the academic calendar — exactly when you most need the system to work.

### 3.2 The fix already exists in the schema and isn't being used
`apps/api/db/schema.sql` defines a `sessions` table:
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  ...
);
```
but it is **never referenced anywhere in `apps/api/routes/*.ts` or `lib/*.ts`** (confirmed by full-text search — only two unrelated code comments mention the word "sessions"). The session-validity mechanism runs entirely on KV today; this table is dead schema. That's actually good news for the fix: **move session-validity tracking from KV to this already-defined D1 table.** D1's write budget (100,000 rows written/day) is 100x more generous than KV's, and a session write is a single small `INSERT`/`UPDATE` — well within D1's per-row-write accounting. Concretely:
- On login: `INSERT INTO sessions (id, user_id, expires_at, ...)` instead of `SESSIONS.put`.
- On `requireAuth`: `SELECT 1 FROM sessions WHERE user_id = ? AND expires_at > datetime('now')` instead of `SESSIONS.get` — this *does* move ~100k/day of reads from KV to D1 as well, but D1's read budget (5,000,000/day) has 50x more headroom than KV's read budget (100,000/day) ever did, so this is a strict improvement on both axes, not a tradeoff.
- On logout: `DELETE FROM sessions WHERE user_id = ?`.
- Add a scheduled cleanup (can piggyback on the existing daily cron in `backup.ts`) to purge expired rows: `DELETE FROM sessions WHERE expires_at < datetime('now')`, which keeps the table small and keeps D1 storage usage flat over time.

**This single change is the highest-leverage fix in this entire report** — it removes the tightest bottleneck in the whole system using a table that's already designed and already in the committed schema, with no new infrastructure.

### 3.3 Rate limiting already (correctly) avoids KV — keep it that way, but fix correctness separately
The earlier security audit flagged `middleware/auth.ts`'s in-memory `Map`-based rate limiter as *not actually distributed* across Workers isolates — that's a correctness problem, but it's worth noting here that the obvious "fix" (move rate-limit counters to KV, which is what most tutorials suggest) would be a **bad idea for free-tier longevity**: rate-limit counters update on every single request, and at any real traffic volume that would blow through the 1,000 writes/day KV budget almost immediately — far faster than the session-write problem in §3.1, because rate-limiting writes scale with *every request*, not just logins. If you fix the distributed-rate-limiting correctness issue, **do it with D1 (using the already-defined-but-unused `rate_limits` table) or Cloudflare's native Rate Limiting Rules (a dashboard/WAF-level feature, not billed against Worker KV/D1 quota at all)** — not KV.

---

## 4. D1 — generous on throughput, but storage has no retention policy

### 4.1 Read/write budget is not a near-term concern
Per-request D1 usage is light: most route handlers issue 1-3 queries (`ums-grades.ts`'s `handleListGrades` does 2: a count + a paginated select; `handleCreateGrade` does 2: an existence check + an insert). Even `routes/auth.ts`'s heaviest paths stay in the low single digits of queries per request. At 100,000 Worker requests/day as the outer ceiling, D1 read volume tops out in the low millions/day even in a worst case of 10+ queries per request — comfortably under the 5,000,000 rows-read/day budget. D1 writes are similarly fine: even moving session writes here (§3.2) adds at most one write per login, nowhere near 100,000/day.

### 4.2 Storage is the real D1 constraint, and three tables grow without bound
`db/schema.sql` defines `admin_audit_logs`, `sync_event_log`, and (implicitly) `application_status_logs` as append-only logs with **no retention, archival, or row-count cap** anywhere in the codebase. None of the route handlers that write to these tables (`logAdminAction` in `lib/types.ts`, `logEvent`/`deadLetter` in `lib/webhook.ts`) ever delete old rows. Over months/years of operation, these three tables — plus the unused `sessions`/`rate_limits` tables if migrated per §3.2 — will grow monotonically toward D1's **5 GB total storage** cap, which is a hard ceiling (not a per-day quota that resets). This is a slow-burn risk rather than an acute one, but it's the kind of thing that's invisible until it suddenly isn't.

**Recommendation:** add a scheduled archival/purge job (again, can piggyback on the existing daily cron) that either (a) deletes `admin_audit_logs`/`sync_event_log` rows older than a retention window (e.g., 1-2 years for audit logs, 90 days for resolved sync events — keep failed/dead-letter rows longer), or (b) periodically exports old rows to R2 (cheap, 10GB free, no egress fees) as compressed JSON/SQL before deleting them from D1, preserving the audit trail without consuming D1 storage indefinitely. Given `admin_audit_logs` exists specifically for compliance/audit purposes, exporting-then-purging (option b) is the safer choice over straight deletion.

---

## 5. R2 — backups will grow without bound; documents are already well-bounded

### 5.1 Document uploads are already correctly capacity-limited (no action needed)
`apps/api/routes/documents.ts` already enforces `MAX_FILE_SIZE = 10MB` and `MAX_FILES_PER_APP = 20`, which caps the worst-case R2 storage growth from the admissions/UMS document-upload feature to a predictable, bounded-per-applicant amount. This is good design already in place and doesn't need optimization.

### 5.2 The daily backup cron has no retention policy and is the actual unbounded-growth risk
`apps/api/backup.ts` runs daily (`"crons": ["0 0 * * *"]`) and writes a brand-new, full SQL dump to R2 every single day, forever:
```ts
const backupKey = `d1-backups/bmi-portal-db-${timestamp}.sql`;
...
await env.BACKUP_BUCKET.put(backupKey, body, { ... });
```
There is no corresponding cleanup of old backup objects anywhere in the codebase. R2's free tier gives you 10 GB-month of storage; a full daily SQL dump of a growing database (especially once `admin_audit_logs`/`sync_event_log` are included or grow per §4.2) will eventually — the exact timeline depends entirely on table growth rate, which wasn't measurable from a static repo snapshot — push cumulative backup storage past 10GB, at which point R2 storage starts being billed rather than being a hard block (R2 doesn't cut you off, it bills overage, so this is a cost risk rather than an outage risk, but it directly contradicts the "$0/month" goal).

**Recommendation:** Use R2's native [Object Lifecycle Rules](this is a dashboard/API feature, not something you write in `backup.ts`) to auto-expire backup objects older than N days (e.g., keep 30 daily backups + 12 monthly backups, expire the rest) — this is the standard, zero-maintenance way to bound backup storage on R2 and costs nothing extra to configure.

### 5.3 The backup job also doesn't cover the whole database, which compounds both a data-safety gap and a false sense of free-tier headroom
`backup.ts`'s hardcoded table list — `users, applications, documents, recommendation_requests, application_status_logs, password_reset_tokens, admin_audit_logs, courses, enrollments, invoices` — omits roughly half of the schema, including **all UMS academic data**: `students`, `staff`, `faculties`, `departments`, `programs`, `academic_terms`, `grades`, `certificates`, plus `cms_pages`, `cms_posts`, `cms_media`. This means current backup storage usage is *under-representing* what a complete backup would actually cost in R2 — if this list is fixed to be complete (which it should be, independent of free-tier concerns — grades and certificates are exactly the kind of data you cannot afford to lose), expect backup size, and therefore R2 storage consumption, to roughly double or more. Budget for that before fixing it, and pair the fix with the lifecycle-rule retention from §5.2 so the two changes land together rather than the completeness fix accidentally being the thing that pushes you over 10GB.

### 5.4 The cron job's own CPU budget will eventually be the limiting factor, not R2
`backup.ts` builds the entire backup as one large in-memory string via synchronous `.map().join()` over every row of every table, in a single Worker invocation. Cron Triggers run as ordinary Worker invocations and share the same CPU-time limits described in §2. As your tables grow (particularly `admin_audit_logs`/`sync_event_log` per §4.2), this loop will eventually consume enough CPU to risk hitting the invocation's CPU-time limit mid-backup, silently truncating the backup with no error surfaced to anyone (the `scheduled()` handler doesn't currently report partial failure distinctly from success). **Recommendation:** stream the backup table-by-table with multiple smaller `R2.put()` calls (one object per table, or chunked multipart) instead of one giant string concatenation, both to stay under the CPU budget as data grows and so a failure on one table doesn't lose the whole backup.

---

## 6. Pages — already well-optimized, with one subtle inconsistency to watch

### 6.1 `bmi-university` is correctly static-exported — this is already the optimal choice
`next.config.mjs`: `output: 'export'`, `images: { unoptimized: true }`. Combined with Cloudflare's own pricing model ("requests to static assets are free and unlimited"), this means marketing-site page views consume **zero** Workers/Pages-Functions quota — visitors are served pre-built HTML/CSS/JS directly from Cloudflare's CDN. This is the single best free-tier decision already made in the codebase; don't undo it by switching to SSR/ISR (see §6.2).

### 6.2 The "ISR" comment in `portalApi.js` doesn't match what static export can actually do
```js
/**
 * Thin server-side client for fetching public data from the BMI Portal API.
 * Used by Next.js pages for ISR (Incremental Static Regeneration).
 */
```
Next.js's static export mode (`output: 'export'`) **does not support ISR** — there is no server to revalidate against once the site is exported to static files; `getPortalPrograms()`/`getPortalStats()`/`getPortalPosts()` only ever run at **build time**, once, and the result is baked into the static HTML until the next deploy. This isn't a bug today (the site still works, it just shows build-time-fresh data, not live data), but it's a misleading comment that could lead a future contributor to either (a) assume content updates automatically and not realize it's stale, or (b) "fix" it by switching to Pages Functions/SSR to get real ISR — which would move every marketing-site page view from "free static asset" to "Workers-Functions invocation," eating into the same 100k/day budget shared with the rest of the system (§2.3), for a marketing site that doesn't need per-request freshness. **Recommendation:** fix the comment to say what's actually true ("fetched at build time; rebuild to refresh"), and if genuinely-live content (e.g., CMS posts, application stats) is a real requirement, solve it with a `client`-side fetch from the already-static page (a small JS call to `/api/public/cms/posts` from the browser, which is what `apps/portal`/`apps/ums` already do) rather than server-side rendering — that keeps the page itself static/free and only spends Worker budget on the specific dynamic widget that needs it.

### 6.3 Build-count budget (500/month) — currently fine, but worth monitoring against your own habits
`.github/workflows/deploy.yml` triggers a Pages deployment for `apps/portal` and `apps/ums` (via `wrangler pages deploy`, which counts toward Pages build/deploy quota similarly to a native Pages build) on **every push to `main`**, plus `bmi-university`'s native Cloudflare Pages Git integration would also build on every push if connected the same way. At 500 builds/month (~16/day), this is generous for typical commit cadence, but three separate frontends all building from the same monorepo on every push to `main` means a single multi-commit day of active development (e.g., 10+ small fixup commits) could consume 30+ builds in a day across the three apps. **Recommendation:** if development cadence ever picks up, consider path-filtering the CI triggers (only build/deploy `apps/portal` when files under `apps/portal/**` or `packages/shared/**` changed, etc. — GitHub Actions supports this natively via the `paths:` filter on the `push` trigger) so an API-only or docs-only commit doesn't trigger three unnecessary Pages builds.

---

## 7. Subrequests — currently fine, one place to watch as features grow

The free tier allows 50 external `fetch()` subrequests per Worker invocation. Current usage per request is low: OAuth callback (`lib/sso.ts`) makes 2 sequential external fetches (token exchange, then userinfo, plus a 3rd conditional GitHub-emails fetch) — well under 50. Outbound webhook dispatch (`lib/webhook.ts`) and email sending (`lib/email.ts`, via Resend) are each a single external fetch per call. There's no current code path that loops over many external calls in one invocation. **Watch this if/when** any future feature does bulk operations (e.g., "send recommendation-request emails to 50 referees in one admin action," or "sync N records to an external CRM in one request") — that's the kind of change that would need to be chunked across multiple invocations (e.g., via Cloudflare Queues, which became free-tier eligible as of Feb 2026 per current docs) rather than looped synchronously in a single request.

---

## 8. Priority-ranked action list

| Priority | Action | Resource fixed | Effort |
|---|---|---|---|
| **P0** | Move session create/check/delete from KV to the existing (unused) `sessions` D1 table | KV writes (1,000/day → effectively removed as a constraint) | Low — table already exists, just needs 3 query rewrites in `auth.ts`/`middleware/auth.ts` |
| **P0** | Reduce PBKDF2 iterations to ~40,000-60,000 (or budget for Workers Paid if you want to stay near OWASP guidance) | Worker CPU time on every login/register/reset | Low — one constant change, document the tradeoff |
| **P1** | Add `ctx.waitUntil()` around fire-and-forget webhook dispatch/logging; thread `ctx` through `index.ts`'s `fetch` export | Reliability of existing retry/dead-letter system (no quota cost either way, but stops wasted re-invocations) | Low |
| **P1** | Add R2 Lifecycle Rules to expire old daily backups (e.g., keep 30 days + 12 months) | R2 storage (bounds growth) | Low — dashboard/API config, no code change |
| **P1** | Fix `backup.ts`'s table list to cover the full schema, paired with the lifecycle rule above | Data-safety + accurate R2 budget picture | Medium |
| **P2** | Stream/chunk the backup job per-table instead of one big string concat | Cron-job CPU time as data grows | Medium |
| **P2** | Add a scheduled purge/archive for `admin_audit_logs`/`sync_event_log` (export-then-delete to R2) | D1 storage (5GB cap) | Medium |
| **P2** | Move rate-limit counters (if fixing the distributed-correctness issue) to D1's unused `rate_limits` table or native Cloudflare Rate Limiting Rules — explicitly not KV | Prevents a *future* KV-write problem worse than §3.1 | Low-Medium |
| **P3** | Fix the misleading "ISR" comment in `portalApi.js`; if live content is needed, fetch client-side rather than switching to SSR | Keeps marketing-site traffic off the Workers request budget | Low |
| **P3** | Add `paths:` filters to `.github/workflows/deploy.yml` so unrelated commits don't trigger all three Pages builds | Pages build/month budget | Low |

**Net effect of just the two P0 items:** they remove the only two failure modes in the current design that are likely to actually trigger under real, non-trivial usage — KV write exhaustion on a busy login day, and CPU-limit termination on a meaningful fraction of every login/register request. Everything else in this report is about extending headroom for growth (months-to-years out) rather than fixing something that's already at risk today.
