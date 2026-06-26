# BMI UMS — Engineering Roadmap

This document captures the technical roadmap and scalability strategy for the BMI University Management System.

---

## Current Architecture (v1)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19 + Vite + TypeScript | SPA served via Caddy |
| Backend API | Hono (Node 20) + OpenAPI | Stateless REST, JWT-authenticated |
| Database & Auth | PocketBase 0.22 | SQLite, embedded auth, real-time subscriptions |
| File Storage | PocketBase built-in | Stored alongside pb_data |
| Reverse Proxy | Caddy 2.9 | Automatic HTTPS, static + API routing |
| LLM | Ollama (local) | llama3.2, runs on-prem |
| Replication | Litestream 0.3 | Continuous SQLite WAL streaming to S3 |
| Container | Docker Compose | Multi-service stack |

---

## Q3 2026 — Stability & Hardening

**Goal: production-ready, observable, secure**

- [ ] **Observability stack**: Add OpenTelemetry SDK to the API; ship traces and metrics to a self-hosted Grafana + Tempo instance
- [ ] **Structured logging**: Replace `console.log` with pino JSON structured logs, then aggregate in Loki
- [ ] **Rate limiting**: Apply per-IP and per-user rate limits via Hono middleware on auth, grades, and finance endpoints
- [ ] **Secret rotation**: Document key rotation procedure for `JWT_SECRET`, `ENCRYPTION_KEY`, and PocketBase admin credentials; add rotation runbook to `docs/`
- [ ] **Audit log persistence**: Flush the in-memory audit log to a PocketBase `audit_logs` collection on every mutating API call
- [ ] **Database backup testing**: Add monthly restore-from-Litestream drill to the operational runbook

---

## Q4 2026 — Performance & Scale

**Goal: support 2,000 concurrent students without horizontal scaling**

- [ ] **Query optimisation**: Profile the top 5 slow queries (StudentQueries, finance reports) using the `EXPLAIN QUERY PLAN` SQLite pragma; add covering indexes
- [ ] **Response caching**: Implement Redis (or Valkey) for caching the `/students` and `/grades` list endpoints; TTL = 30 s, invalidated on write
- [ ] **Pagination enforcement**: Enforce a hard `maxPerPage: 200` limit on all list endpoints; remove unbounded queries in import scripts
- [ ] **Connection pooling**: Increase the PocketBase connection pool size in `pocketbasePool.ts` from the default to `min: 2, max: 10`
- [ ] **Frontend bundle splitting**: Split the Recharts and `html2pdf.js` bundles into separate dynamic imports to reduce initial JS payload below 200 kB

---

## 2027 — Horizontal Scalability

**Goal: multi-campus, multi-tenant capable**

- [ ] **Migrate from SQLite to PostgreSQL**: Replace PocketBase (SQLite) with Supabase OSS or a self-hosted PostgreSQL instance; migrate the Hono backend to use `postgres.js` or Drizzle ORM
- [ ] **Stateless backend scaling**: Ensure all state is stored in the database or Redis; deploy multiple API instances behind a load balancer
- [ ] **Multi-campus tenancy**: Add a `campus_id` foreign key to students, staff, and finance tables; enforce row-level security in PostgreSQL
- [ ] **CDN for static assets**: Serve the frontend bundle and document assets through a CDN (Cloudflare R2 / AWS S3 + CloudFront)
- [ ] **Event-driven grade sync**: Replace the polling-based Google Sheets sync with a webhook-driven event queue (e.g., BullMQ + Redis)

---

## Ongoing — Developer Experience

- [ ] **E2E test coverage**: Extend the Playwright test suite to cover the full student registration, grade submission, and certificate generation flows
- [ ] **Storybook**: Add a Storybook instance for UI component development and visual regression testing
- [ ] **API versioning**: Introduce `/api/v2` when making breaking schema changes; keep `/api/v1` alive for at least one semester
- [ ] **OpenAPI code generation**: Use `openapi-ts` to auto-generate typed API clients for the frontend, removing the hand-written `authFetch` wrappers
- [ ] **Dependency updates**: Automate dependency updates via Renovate Bot with grouped PRs; pin major versions

---

## Known Technical Debt

| Item | Severity | Proposed Fix |
|------|----------|-------------|
| `students.optimized.ts` parallel route file | Medium | Consolidate into `students.ts`; delete the duplicate |
| Root-level debug `.ts` scripts | Low | Moved to `scripts/legacy/` in Phase 4 cleanup |
| `teaching_guide.cjs` (109 kB) in repo root | Low | Move to `docs/` or remove |
| PocketBase admin credentials in `.env` | High | Migrate to a secrets manager (Doppler / Vault) before production |
| Unbounded `import-all-data.ts` batch | Medium | Add progress reporting and chunk size limits |

---

## Deprecation Timeline

| Feature | Deprecation | Removal |
|---------|------------|---------|
| `xlsx` npm package | 2026-05-29 (migrated to exceljs) | Already removed |
| `add-mock-students.ts` | Q3 2026 | Q4 2026 |
| `reset-and-import.ts` | Q3 2026 | Q4 2026 |
| PocketBase-embedded auth (when migrating to PostgreSQL) | 2027 | With PostgreSQL migration |
