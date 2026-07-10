# BMI-System → Enterprise SIS: Production Wiring Plan
**Target repo:** `BMI-UNIVERSITY/bmi-system` (Cloudflare Workers + D1 + KV + R2 + Pages, free tier)
**Basis:** live inspection of `apps/api/db/schema.sql`, `BMI-SYSTEM_Comprehensive_Audit.md`, `BMI-SYSTEM_Cloudflare_FreeTier_Optimization.md` — not assumptions.

---

## 1. Reality check: what the SIS spec assumes vs. what's actually deployed

The master SIS prompt was written stack-agnostic (and defaulted to PostgreSQL). The real system is **Cloudflare D1 (SQLite)**, single Worker, single DB, already live with real users. This changes the plan materially — this is a **retrofit onto a live schema**, not a greenfield build. Here's the actual gap, table by table:

| SIS concept | Exists in `bmi-system` today? | Evidence |
|---|---|---|
| Person (identity independent of role) | **No.** `users` conflates login credentials + identity + role (`applicant/student/staff/admin`) in one row/one table. | `schema.sql`: `users.role CHECK(...)` |
| Permanent UID | **No.** No UID column anywhere. | full schema scan |
| Application Number | **No.** `applications.id` is a random blob, not a formatted, sequential, human-facing number. | `applications` DDL |
| Registration Number | **Partially.** `students.reg_no` exists (`UNIQUE NOT NULL`) but generation logic/format wasn't reviewed here and needs auditing — treat as unverified, not confirmed-correct. | `students` DDL |
| StudentProgramme history | **No.** `students.program` is a free-text column, not an FK, and there is no history table — a program transfer today would just overwrite this field with no historical record. | `students` DDL |
| Programme/Faculty/Department/Term structure | **Yes, already built.** `faculties`, `departments`, `programs`, `academic_terms`, `courses.department_id` all exist and are reasonably normalized. | `schema.sql` "Phase 5" section |
| Finance account | **Partially.** `invoices` table exists, tied directly to `users.id` — functionally a finance record, just not modeled as a separately-provisioned "account." | `invoices` DDL |
| Library / LMS / Portal / Email provisioning | **No.** No tables, no provisioning jobs. | full schema scan |
| ID Card | **No.** | full schema scan |
| Lifecycle workflow engine (state machine) | **No.** Only `applications.status` and `students.status` exist as flat enums — there is no cross-stage pipeline, no idempotency, no resumability. | full schema scan |
| Audit logging | **Yes, solid.** `admin_audit_logs`, `application_status_logs`, `sync_event_log`, `webhook_dead_letters` all exist and are actively used. | `schema.sql`, audit §1.8/§1.11 |
| Grading/Certificates | **Partially built,** and **currently the highest-risk area**: the audit found the UMS frontend's grade-reading code (`academicRecordsService.ts`) assumes a data shape the backend (`ums-grades.ts`) doesn't return — transcripts/GPA are likely rendering broken today. | Comprehensive Audit §2.6c |

**Conclusion:** roughly 60% of the SIS's academic-structure layer (Faculty/Department/Programme/Term/Course) is already live and reusable. The identity layer (Person/UID/Application Number/StudentProgramme history) and the entire provisioning/workflow layer are net-new. This plan is scoped accordingly — extend what exists, add what's missing, touch nothing that already works.

---

## 2. Governing strategy

1. **Stabilize before extending.** Two P0 bugs in the existing system (CI deploys with no test gate; CORS trusts `*.pages.dev` with credentials) mean any new identity/workflow code shipped today has no safety net and a real cross-origin data-read exposure. Fix these first — not because they block the SIS work technically, but because every phase below adds surface area that inherits whatever risk is already live.
2. **Additive only.** No phase drops or renames an existing column/table that's in active use (`users`, `students.reg_no`, `applications`, `enrollments`, `invoices`, `courses`). New identity concepts are layered on top via new tables and nullable FK columns, with backfill scripts — never a destructive rewrite of a live table.
3. **D1-native concurrency, not Postgres locking.** D1 has no cross-request row locking (`SELECT ... FOR UPDATE`). The correct pattern for the Registration Number / Application Number generators is a **single atomic `UPDATE ... RETURNING`** statement against a dedicated counter table — SQLite/D1 executes a single prepared statement atomically, so this avoids the race condition without needing transactional locking semantics Postgres has and D1 doesn't.
4. **Budget every new write path against the two audits' numbers**, not against a vibe. Every phase below states its D1/KV/R2 impact explicitly.
5. **Fix the KV session bottleneck before adding any new login-adjacent feature.** The optimization report already found KV writes (1,000/day) is the tightest real constraint, caused entirely by session-on-login. Any new provisioning step that also touches KV inherits that ceiling. Move sessions to the existing unused `sessions` D1 table first (§4, Phase 0).

---

## 3. Free-tier budget model for this project

Reference limits (June 2026, verified against Cloudflare docs — see optimization report §1):

| Resource | Free limit | Current usage pattern | New SIS load |
|---|---|---|---|
| D1 writes | 100,000/day | Low (few per request) | Adds ~1-3 writes per *lifecycle event* (application submit, admission, enrollment, grade post) — these are low-frequency, human-paced events, not per-request. Negligible impact. |
| D1 reads | 5,000,000/day | Low | Registration/lifecycle lookups add a handful of reads per relevant request. Negligible. |
| D1 storage | 5 GB hard cap | Growing unbounded on 3 audit tables already (existing finding) | New audit/log tables (`lifecycle_events`, provisioning job logs) **must ship with retention/archival from day one** — don't repeat the existing unbounded-log mistake. |
| KV writes | 1,000/day (tightest constraint in the whole system) | Already at risk from session-per-login | **Do not** put any new SIS state in KV. Sessions must move to D1 first. |
| R2 storage | 10 GB-month | Bounded (uploads capped), but backups unbounded (existing finding) | ID card images, if generated as files, go to R2 with the same per-student bounded pattern already used for documents — no new risk if capped similarly (e.g. 1 current ID card image per student, old ones expired via lifecycle rule). |
| Workers CPU | 10ms/invocation | Already stressed by PBKDF2 (existing finding) | New route handlers doing UID/RegNo generation are cheap (single `UPDATE...RETURNING` + a few `INSERT`s) — no new CPU risk, but don't add these calls to the *login* code path where the existing CPU problem already lives. |
| Workers subrequests | 50/invocation | Low | Provisioning jobs (Library/LMS/Email account creation) that call external services should be dispatched via **Cloudflare Queues** (free-tier eligible as of Feb 2026 per the optimization report) rather than looped synchronously in one request — keeps this at zero risk as more integrations are added. |
| Pages builds | 500/month | Fine today | No change — this work is backend/schema-heavy, not frontend-build-heavy. |

**Net assessment:** the SIS identity/workflow layer is D1-write-cheap and D1-storage-risky only if new audit tables are left unbounded like the existing ones. The one hard prerequisite is getting sessions off KV before adding anything else that could plausibly want KV.

---

## 4. Phase-by-phase plan

### Phase 0 — Stabilize the foundation (do this first, before any schema work)
**Goal:** remove the two P0 risks and the one KV bottleneck so everything after this is being built on solid ground.

- Add `needs: test` to all three deploy jobs in `.github/workflows/deploy.yml`; remove `continue-on-error: true` from the test job.
- Replace `origin.endsWith('.pages.dev')` in `apps/api/lib/types.ts` with an explicit allow-list (use `ALLOWED_ORIGINS_OVERRIDE`, already present).
- Move session create/check/delete from `env.SESSIONS` (KV) to the existing, currently-unused `sessions` D1 table in `apps/api/routes/auth.ts` and `apps/api/middleware/auth.ts` (3 call sites per the optimization report).
- Verify (don't assume) the grades data-shape mismatch (`academicRecordsService.ts` vs `ums-grades.ts` — Comprehensive Audit §2.6c) — this directly affects the Grading/Certificate part of the SIS lifecycle you're about to extend, so it needs to be true or fixed before you build more on top of it.

**D1/KV impact:** removes ~100% of current KV write pressure; adds trivial D1 write load.
**Acceptance:** CI blocks a deliberately-broken PR; a cross-origin `*.pages.dev` page cannot read `/api/auth/me`; a login under simulated load doesn't 401 due to KV exhaustion; transcript view renders real grade data end-to-end in a staging test.

---

### Phase 1 — Introduce the Person/UID layer (additive, non-breaking)
**Goal:** decouple permanent identity from login/role, without touching `users` structurally.

- New migration `apps/api/migrations/00XX_add_persons_uid.sql`:
  - `CREATE TABLE persons (id TEXT PRIMARY KEY, uid TEXT UNIQUE NOT NULL, national_id TEXT, passport_no TEXT, first_name TEXT, middle_name TEXT, last_name TEXT, gender TEXT, date_of_birth TEXT, nationality TEXT, created_at TEXT, updated_at TEXT)`
  - `CREATE TABLE uid_counters (id INTEGER PRIMARY KEY CHECK (id = 1), last_serial INTEGER NOT NULL DEFAULT 0)` — singleton counter row.
  - `ALTER TABLE users ADD COLUMN person_id TEXT REFERENCES persons(id)` — nullable at first.
- UID generator: `UPDATE uid_counters SET last_serial = last_serial + 1 WHERE id = 1 RETURNING last_serial` as one atomic statement → format `BMI{last_serial padded to 9 digits}`.
- **Backfill script** (one-off, run via `wrangler d1 execute`): for every existing row in `users` where `role IN ('student','staff')`, create a `persons` row, generate a UID, set `users.person_id`. Applicants without an admission decision yet do **not** get a UID (per the SIS spec — UID is generated on admission acceptance, not on application).
- Do not yet make `person_id` `NOT NULL` — that's a later phase, after backfill is verified complete.

**D1 impact:** one-time backfill writes (bounded by current user count, trivial); ongoing UID generation is 1 write per admission acceptance — a low-frequency event.
**Acceptance:** every current student/staff row has a `persons` row and a UID; UID format is validated against the spec examples; the atomic counter survives a concurrency test (fire N simultaneous requests, confirm N unique sequential UIDs, zero duplicates).

---

### Phase 2 — Application Number + Applicant separation
**Goal:** give `applications` a real, sequential, human-facing identifier, matching `APP-{Year}-{Serial}`.

- Migration: `ALTER TABLE applications ADD COLUMN application_number TEXT UNIQUE`; `CREATE TABLE application_number_counters (year INTEGER PRIMARY KEY, last_serial INTEGER NOT NULL DEFAULT 0)`.
- Generator: same atomic `UPDATE...RETURNING` pattern, keyed by year, called at application submission time (`routes/apply.ts`), not at draft-creation time (per the SIS lifecycle: "Generated immediately after application submission").
- Backfill existing `applications` rows with a generated number based on `created_at` year, in `id` creation order, clearly logged as backfilled (don't silently fabricate history — write a one-line note to `admin_audit_logs` recording the backfill run).

**D1 impact:** 1 write per submission — negligible.
**Acceptance:** every new submission gets a correctly-formatted, unique number; concurrent submissions in the same year never collide (same concurrency test pattern as Phase 1).

---

### Phase 3 — Programme linkage + StudentProgramme history
**Goal:** stop `students.program` from being a dead-end free-text field; preserve full program history per student.

- Migration:
  - `ALTER TABLE students ADD COLUMN program_id TEXT REFERENCES programs(id)` (nullable initially).
  - `CREATE TABLE student_programs (id TEXT PRIMARY KEY, uid TEXT NOT NULL REFERENCES persons(uid), registration_number TEXT, program_id TEXT NOT NULL REFERENCES programs(id), admission_year INTEGER NOT NULL, enrollment_date TEXT NOT NULL, completion_date TEXT, status TEXT NOT NULL, current_flag INTEGER NOT NULL DEFAULT 1, graduated_flag INTEGER NOT NULL DEFAULT 0, cgpa REAL, classification TEXT)`.
- **Backfill:** for every existing `students` row, attempt a best-effort match of the free-text `program` value against `programs.name`/`programs.code`; where no confident match exists, leave `program_id` NULL and flag the row in a short report rather than guessing — this is exactly the kind of silent-data-corruption risk the earlier audits have repeatedly caught elsewhere in this codebase, don't repeat it here.
- Programme transfer logic (new, in `routes/ums-*.ts` or a new `routes/programmes.ts`): never updates `students.program_id` directly for a transfer — always inserts a new `student_programs` row, sets the old row's `current_flag = 0`, and only then updates the convenience pointer on `students`.

**D1 impact:** negligible; one row per program enrollment/transfer event.
**Acceptance:** a simulated program transfer preserves the original `student_programs` row unchanged and adds a new one; `students.program_id` always matches the current-flagged row.

---

### Phase 4 — Registration Number generator (the highest-risk piece, per its own §)
**Goal:** implement `BMI/{Career}/{ProgrammeCode}/{AdmissionYear}/{Serial}` with real concurrency safety on D1.

- `CREATE TABLE regno_counters (program_id TEXT NOT NULL, admission_year INTEGER NOT NULL, last_serial INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (program_id, admission_year))`.
- Generator: `INSERT INTO regno_counters (program_id, admission_year, last_serial) VALUES (?, ?, 1) ON CONFLICT(program_id, admission_year) DO UPDATE SET last_serial = last_serial + 1 RETURNING last_serial` — single atomic statement, handles both first-ever and subsequent calls for a given program/year without a separate existence check.
- Wire this into the enrollment step of the pipeline (Phase 5), not directly into `students` creation — Registration Number is generated *after* program enrollment, per the spec's lifecycle order.
- **Load-test this specifically** before relying on it: simulate a registration-period burst (e.g. 50 concurrent enrollment requests for the same program/year) against a staging D1 instance and confirm zero duplicate or skipped serials.

**D1 impact:** negligible write volume; this phase is about correctness under concurrency, not budget.
**Acceptance:** the load test above passes with zero collisions.

---

### Phase 5 — Lifecycle workflow engine
**Goal:** replace the current flat `applications.status`/`students.status` enums with an explicit, auditable, resumable state machine covering the full Application→Alumni pipeline.

- `CREATE TABLE lifecycle_events (id TEXT PRIMARY KEY, uid TEXT REFERENCES persons(uid), application_id TEXT REFERENCES applications(id), stage TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','in_progress','completed','failed','skipped')), idempotency_key TEXT UNIQUE, actor_id TEXT REFERENCES users(id), notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`.
- Stages match the master lifecycle exactly (application_submitted → application_number_generated → ... → alumni). Each stage transition is one row, never an update to a prior row — this *is* the audit trail, consistent with the existing "nothing overwritten" principle already used elsewhere in this schema.
- Admission acceptance becomes the trigger point that: creates/links the `persons` row + UID (Phase 1) → creates the `students` row → creates the `student_programs` row (Phase 3) → generates the Registration Number (Phase 4) → enqueues downstream provisioning (Phase 6). Each of these sub-steps writes its own `lifecycle_events` row with its own `idempotency_key`, so a partial failure can be resumed without repeating completed sub-steps.
- **Retention:** add this table to the same archival job pattern recommended for `admin_audit_logs`/`sync_event_log` in the optimization report — export-then-purge rows older than the retention window, don't let it grow unbounded like those tables currently do.

**D1 impact:** ~5-8 small writes per admitted student, one time — trivially within budget even at hundreds of admissions/day.
**Acceptance:** killing the Worker mid-pipeline (simulated) and re-triggering the same admission acceptance does not duplicate any completed sub-step, verified by `idempotency_key`.

---

### Phase 6 — Downstream provisioning (Finance, Library, LMS, Portal, Email, ID Card)
**Goal:** each becomes an independent, retryable job — not an inline synchronous chain.

- Finance: extend existing `invoices`/student-payment flow (already present) rather than building a parallel "Finance Account" concept — link new invoices to `uid`, not just `user_id`, going forward.
- Library/LMS/Portal/Email: new `provisioning_jobs` table (`id, uid, job_type, status, attempts, last_error, created_at, completed_at`), dispatched via **Cloudflare Queues** (free-tier eligible) rather than synchronous `fetch()` calls inside the admission-acceptance request — this keeps subrequest count and CPU time on that request low and makes each provisioning step independently retryable, reusing the same HMAC-signed, backoff-and-dead-letter pattern already built and working for the existing webhook dispatcher (`lib/webhook.ts`) rather than inventing a second retry mechanism.
- Email address generation: configurable policy (studentnumber@ vs firstname.lastname@) stored in the existing `app_config` table, generated as one of these provisioning jobs, with collision handling.
- ID Card: generate as an R2 object (QR/barcode + photo composited), keyed by `uid`, with only the current card retained per student (superseded cards can be deleted or lifecycle-expired) — bounded growth, consistent with how document uploads are already correctly capped in this codebase.

**D1/R2 impact:** one row per job per student in `provisioning_jobs` (bounded, retire completed jobs on a schedule); ID card images are small and one-per-student — negligible against the 10GB R2 budget.
**Acceptance:** simulate an LMS provisioning failure — confirm Finance/Portal/Email jobs are unaffected, the failed job retries per the existing backoff pattern, and it reaches `dead` status with an ops alert (reusing `lib/webhook.ts`'s existing dead-letter + alert pattern) rather than failing silently.

---

### Phase 7 — RBAC, retention policy, and testing
- Extend the existing per-route `requireAuth(request, env, [roles])` pattern (already consistent across the codebase) to cover new routes for program transfers, lifecycle event queries, and provisioning job status — no new RBAC mechanism needed, reuse what's there.
- Add the missing **External Verifier** role (read-only, scoped to certificate/registration-number verification only) — directly useful given the accreditation and dual-domain concerns already flagged in the website audit.
- Write the retention/archival job once (export-to-R2-then-purge, per optimization report §4.2) and apply it uniformly to `admin_audit_logs`, `sync_event_log`, `lifecycle_events`, and `provisioning_jobs` — don't solve this per-table.
- Backfill unit tests for the new route handlers as they're written (not after) — this avoids repeating the existing 0%-coverage-on-business-logic problem found in `apps/api/routes/*` (Comprehensive Audit §2.5) rather than adding another 2,000+ untested lines to that same pile.
- Specifically add the concurrency load test from Phase 4 as a permanent CI-adjacent check (can run manually against staging before each registration period, doesn't need to be in the hot CI path).

---

## 5. Sequencing summary

```
Phase 0 (stabilize)  →  must complete first, unblocks everything else safely
Phase 1 (Person/UID) →  Phase 2 (App Number)  →  can run in parallel with each other
        ↓
Phase 3 (StudentProgramme) → Phase 4 (RegNo generator)  →  sequential, RegNo depends on program link existing
        ↓
Phase 5 (Lifecycle engine) →  wires 1-4 together into one auditable pipeline
        ↓
Phase 6 (Provisioning)     →  depends on Phase 5's idempotency-key pattern
        ↓
Phase 7 (RBAC/retention/tests) →  ongoing, but formalize once the shape of 1-6 is stable
```

Each phase ships as its own migration file(s) following the repo's existing convention (`apps/api/migrations/000X_description.sql`, tracked via the existing `_migrations` table), its own PR, and is gated by Phase 0's now-enforced CI test requirement before merge.

---

## 6. What NOT to do

- Don't rebuild the academic structure (Faculty/Department/Programme/Term) — it's already reasonably normalized and live. Extend it, don't replace it.
- Don't put any new SIS state in KV. The one existing KV use case (sessions) is already being moved off KV in Phase 0 specifically because it's the tightest quota in the whole system.
- Don't synchronously chain Library/LMS/Portal/Email provisioning inside the admission-acceptance request — that's the exact pattern that turns one slow external integration into a failure of the whole pipeline.
- Don't add a new audit/log table without a retention plan from day one — this codebase already has three tables that made that mistake; a fourth and fifth would compound the same 5GB D1 storage risk the optimization report already flagged.
- Don't attempt Postgres-style row locking on D1 — use the atomic `UPDATE...RETURNING` counter pattern throughout (Phases 1, 2, 4).
