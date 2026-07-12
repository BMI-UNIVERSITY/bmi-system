# BMI University System — Monorepo

A unified, 100% serverless edge-native Student Information System (SIS) for BMI University, built on the **Cloudflare platform**.

> **Architecture Note:** The system was originally designed with a split-worker topology (`apps/workers/{auth,ums,core,webhooks,public}`). That design was rolled back on 2026-07-09 in favor of a single API Worker monolith. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the current topology and the rationale.

## Documentation Hub

- [**Architecture Overview**](./docs/ARCHITECTURE.md) — Domain workers, DNS routing, and the WriteQueue DO.
- [**On-Call Runbook**](./docs/RUNBOOK.md) — Alerting, triage, and handling `SQLITE_BUSY` or dead webhooks.
- [**Caching Strategy**](./docs/cache.md) — Mitigation for D1 read saturation.
- [**Database Migrations**](./docs/database-migrations.md) — How to apply schema changes.
- [**Security & Technical Audits**](./docs/audits/) — Historical audit reports and remediation logs. *(Note: These reports document past vulnerabilities that have since been fully patched. They are preserved for historical traceability but do not reflect the current, hardened state of the system.)*

## Repository Structure

```text
├── apps/
│   ├── api/        → Cloudflare Worker (single monolith, all /api/* routes)
│   ├── portal/     → React + CF Pages   (Public Admissions Portal)
│   └── ums/        → React + CF Pages   (Internal UMS for Staff & Students)
├── packages/
│   ├── shared/     → @bmi/shared        (Types, constants, programs list)
│   ├── ports/      → @bmi/ports         (Hexagonal-architecture interfaces)
│   ├── adapters/   → @bmi/adapters      (Implementations: Cloudflare, AWS, etc.)
│   ├── bootstrap/  → @bmi/bootstrap     (DI factory wiring ports → adapters)
│   └── api-middleware/ → @bmi/api-middleware (Auth, CORS, rate-limit, cache, logger)
├── bmi-university/ → Next.js + CF Pages (Marketing Website)
└── docs/           → System documentation and runbooks
```

## Local Development

```bash
# Install all workspace dependencies
npm install

# Start the API Worker locally
cd apps/api && npm run dev

# Run the portal or UMS frontends
cd apps/portal && npm run dev
cd apps/ums && npm run dev
```

## Deployment (Cloudflare)

Deployment is fully automated via GitHub Actions (`.github/workflows/deploy.yml`). Pushing to `main` will detect changes using path filters and deploy only the affected workers or frontends.

### Manual Database Migrations
```bash
cd apps/api
npm run db:migrate # Applies tracked migrations to production D1
```

## Environment Config
Secrets must be set via `wrangler secret put` for each respective worker.
See [Architecture](./docs/ARCHITECTURE.md) for details on worker boundaries.
