# BMI University System — Monorepo

A unified, 100% serverless edge-native Student Information System (SIS) for BMI University, built on the **Cloudflare platform**.

## Documentation Hub

- [**Architecture Overview**](./docs/ARCHITECTURE.md) — Domain workers, DNS routing, and the WriteQueue DO.
- [**On-Call Runbook**](./docs/RUNBOOK.md) — Alerting, triage, and handling `SQLITE_BUSY` or dead webhooks.
- [**Caching Strategy**](./docs/cache.md) — Mitigation for D1 read saturation.
- [**Database Migrations**](./docs/database-migrations.md) — How to apply schema changes.
- [**Security & Technical Audits**](./docs/audits/) — Historical audit reports and remediation logs. *(Note: These reports document past vulnerabilities that have since been fully patched. They are preserved for historical traceability but do not reflect the current, hardened state of the system.)*

## Repository Structure

```text
D:\BMI\
├── apps/
│   ├── workers/    → Cloudflare Workers (auth, ums, core, webhooks, public)
│   ├── portal/     → React + CF Pages   (Public Admissions Portal)
│   └── ums/        → React + CF Pages   (Internal UMS for Staff & Students)
├── packages/
│   ├── shared/     → @bmi/shared        (Types, constants, programs list)
│   └── middleware/ → @bmi/api-middleware(Logger, Auth, Cache utils)
├── bmi-university/ → Next.js + CF Pages (Marketing Website)
└── docs/           → System documentation and runbooks
```

## Local Development

```bash
# Install all workspace dependencies
npm install

# Start a specific worker locally (e.g., ums)
cd apps/workers/ums && npm run dev

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
