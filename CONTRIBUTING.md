# Contributing to BMI System

Thank you for contributing to the BMI University SIS! This guide covers everything you need to know to set up your environment, write code, and open a pull request.

---

## 🧰 Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 24.x | [nodejs.org](https://nodejs.org) |
| npm | 10.x (bundled with Node 24) | — |
| Wrangler CLI | 4.x | `npm install -g wrangler` |
| Git | Latest | — |

---

## 🚀 Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/BMI-UNIVERSITY/bmi-system.git
cd bmi-system

# 2. Install all workspace dependencies
npm install

# 3. Authenticate with Cloudflare (required for wrangler dev)
wrangler login

# 4. Start the API worker locally
cd apps/api
npm run dev
# → Available at: http://localhost:8787

# 5. Start the UMS frontend
cd apps/ums
npm run dev
# → Available at: http://localhost:5173
```

### Environment Variables

Copy the example env file and fill in your values:
```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Secrets for local development use `.dev.vars` files (ignored by git):
```ini
# apps/workers/auth/.dev.vars
JWT_SECRET=your-local-secret-here
PASSWORD_PEPPER=your-local-pepper-here
RESEND_API_KEY=re_xxxx
```

---

## 🏗️ Repository Structure

```text
bmi-system/
├── apps/
│   ├── api/            → API Worker + D1 migrations (source of truth)
│   ├── workers/        → Domain Workers (auth, ums, core, webhooks, public)
│   ├── portal/         → React/Vite — Public admissions portal (CF Pages)
│   └── ums/            → React/Vite — Staff & student UMS (CF Pages)
├── packages/
│   ├── shared/         → @bmi/shared — Types, constants, IDatabase interface
│   └── api-middleware/ → @bmi/api-middleware — Logger, auth, CORS, tracing
├── bmi-university/     → Next.js marketing website (CF Pages)
├── scripts/            → Utility scripts (e.g., rotate-keys.ts)
├── terraform/          → Infrastructure as Code (Cloudflare resources)
└── docs/               → ARCHITECTURE.md, RUNBOOK.md, audit reports
```

---

## 📐 Coding Standards

### TypeScript
- **Strict mode** is enabled in all packages. No `any` without a comment.
- Use named exports over default exports for utilities and types.
- Prefer `const` over `let`. Never use `var`.

### Logging
- **Never use `console.log` directly.** Always use `createLogger()` from `@bmi/api-middleware`.
- The logger automatically redacts PII fields (`email`, `studentId`, `password`, etc.).
- Use `requestLogger(log, request).child({ reqId })` for request-scoped logging.

### Request Tracing
- Every worker's `fetch` handler must call `withRequestId(request)` at the top.
- Pass `reqId` to all log entries and inject it into outbound `fetch` calls with `injectTraceHeaders`.

### Database Writes
- **All D1 writes** must go through `enqueueWrite(env, sql, params, shardKey)` from `WriteQueue.ts`.
- Never call `env.DB.prepare().run()` directly in routes — this bypasses the write queue and risks `SQLITE_BUSY`.
- Use the `shardKey` parameter (e.g., `student_id`) for consistent routing.

### Rate Limiting
- The `rateLimit()` middleware is applied globally at the top of each Worker's router.
- Limits: **50 req/min** (unauthenticated), **500 req/min** (authenticated).
- Do not bypass or modify limits without an approved security review.

---

## 🔄 Development Workflow

1. **Create a branch**: `git checkout -b feat/my-feature` or `fix/bug-description`
2. **Write code**: Follow the coding standards above.
3. **Run type checks**: `npm run type-check` in the affected package.
4. **Run tests**: `npm test` before pushing.
5. **Push and open a PR**: Target the `main` branch.

### Branch Naming
- `feat/` — new features
- `fix/` — bug fixes
- `chore/` — dependency updates, config changes
- `docs/` — documentation changes
- `security/` — security patches (requires team lead review)

---

## 🧪 Testing

| Type | Command | Location |
|------|---------|----------|
| Unit tests | `npm test` | `apps/*/` and `packages/*/` |
| E2E tests | `npm run test:e2e` | `apps/ums/` |
| Type check | `npm run type-check` | any package |

- Target **>80% code coverage** for core business logic.
- Unit tests use **Vitest** with Miniflare for D1/DO mocking.
- E2E tests use **Playwright** and run against the local dev server.

---

## 📬 Pull Request Guidelines

- **Title**: Use the format `[type]: brief description` (e.g., `feat: add MFA email recovery`).
- **Description**: Fill in the PR template — what changed, why, and how to test it.
- **Breaking changes**: If you're modifying an API route, ensure it is versioned under `/v1` and the frontend client is updated simultaneously.
- **Security changes**: Tag `@security-team` for review on any changes to auth, rate limiting, or logging redaction.
- **Contract changes**: Any change to the shared `@bmi/shared` package must be reviewed by all consuming teams.

---

## 🔒 Security Reporting

Do **not** open public GitHub issues for security vulnerabilities. Email `security@bmiuniversity.org` with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We will respond within 48 hours.

---

## 📖 Further Reading

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [On-Call Runbook](./docs/RUNBOOK.md)
- [Caching Strategy](./docs/cache.md)
- [Database Migrations](./docs/database-migrations.md)
