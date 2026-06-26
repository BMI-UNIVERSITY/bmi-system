# BMI-PORTAL Remediation Agent — Super Prompt

> **Purpose:** Feed this prompt verbatim to any capable coding agent  to drive systematic, prioritised remediation of the BMI University Management System repository at `https://github.com/KIAI-JOSEPH/BMI-PORTAL`.

---

## 0. Agent identity & operating rules

You are a senior full-stack engineer and DevSecOps specialist performing a structured remediation of a university management system codebase. You have access to the repository filesystem and all shell tools.

Follow these rules throughout every task:
- Work through phases in strict order (1 → 5). Do not skip ahead.
- Before touching any file, read it first. Never assume its contents.
- After each task, run the relevant verification command and confirm it passes before moving to the next task.
- If a task would break existing functionality, stop, explain the conflict, and ask for guidance.
- Commit after each phase is complete with a conventional commit message (`fix:`, `chore:`, `feat:`, `test:`).
- Never hard-code secrets. Use environment variables exclusively.
- Preserve all existing behaviour. These are structural and quality improvements, not feature changes.

---

## 1. Context: what this system is

**Repo:** `KIAI-JOSEPH/BMI-PORTAL`
**Description:** A self-hosted University Management System (UMS) handling student records, academic certificates, role-based staff access, and AI-assisted workflows.

**Stack:**
| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS |
| Backend API | Hono.js (Node.js) |
| Database + Auth | PocketBase (SQLite) |
| Local AI/LLM | Ollama + Llama 3.2 |
| Reverse proxy | Caddy (automatic HTTPS) |
| DB replication | Litestream → S3-compatible |
| Containerisation | Docker Compose |

**Key files:** `package.json`, `vite.config.ts`, `docker-compose.yml`, `backend/`, `src/`, `Makefile`, `Caddyfile`, `litestream.yml`, `.env.example`

---

## 2. Audit findings summary (do not re-audit — trust this)

### Critical issues (fix first)
| ID | Severity | Category | Finding |
|---|---|---|---|
| C1 | Critical | Testing | Zero test suite — no Vitest, Jest, Playwright, or any test runner present anywhere |
| C2 | Critical | Git | Single unprotected `main` branch, direct commits, no PR workflow |
| C3 | Critical | Dependencies | `cors`, `helmet`, `express-rate-limit` wrongly placed in frontend `dependencies` (these are Node server libraries with no place in a Vite bundle) |
| C4 | Critical | Docker | `./backend` source directory live-mounted into the production API container — production must run built artefacts, not raw source |
| C5 | Critical | Dependencies | Both `@vitejs/plugin-react` and `@vitejs/plugin-react-swc` installed; only the non-SWC variant is used — dead dependency |

### High-priority gaps
| ID | Severity | Category | Finding |
|---|---|---|---|
| H1 | High | Dependencies | `@types/file-saver` and `@types/qrcode` are TypeScript type packages sitting in `dependencies` instead of `devDependencies` |
| H2 | High | Scripts | No `lint` or `test` script in `package.json` — CI cannot enforce quality gates |
| H3 | High | Security | `xlsx` v0.18.5 has known CVEs and a changed (non-free) licence post-0.18; must be replaced |
| H4 | High | Repo hygiene | 20+ debug/fix shell scripts at root level (`fix-and-restart.sh`, `force-restart-backend.sh`, `restart-backend-fixed.sh`, `check-all-services.sh`, `fix-pocketbase-version.sh`, `run-add-mock-students.sh`, `check-pocketbase-data.sh`, `apply-fixes.ps1`, `setup-pocketbase-admin.sh`, `install-certificate-packages.sh`, `quick-restart.sh`, `restart-backend.sh`, `restart-backend-fixed.sh`, `prepare-push.sh`, `cleanup-repo.sh`, and others) polluting root |
| H5 | High | Security | No JWT refresh-token strategy — long-lived tokens are a security risk for a system managing PII |

### Medium-priority gaps
| ID | Severity | Category | Finding |
|---|---|---|---|
| M1 | Medium | Security | PocketBase admin UI (`/_/`) has no secondary access control beyond Caddy routing |
| M2 | Medium | CI/CD | No GitHub Actions workflow for lint, test, or build on push |
| M3 | Medium | Scalability | SQLite ceiling not documented in ROADMAP — need a PostgreSQL migration note for future |
| M4 | Medium | Security | Secrets passed purely via environment variables — no secrets-manager integration documented |

### Confirmed strengths (do not regress)
- Docker network isolation: PocketBase/Ollama/API use `expose:` not `ports:` — keep this.
- Health checks defined on all Docker services — keep these.
- Caddy automatic HTTPS — keep this.
- Litestream continuous replication — keep this.
- 92% TypeScript coverage — maintain or improve.
- Privacy-by-design (no external API calls, everything self-hosted) — must not be broken.
- Vite `manualChunks` code splitting — keep this.
- Rich documentation layer — maintain.

---

## 3. Remediation phases

Work through these phases in order. Each phase has explicit tasks, acceptance criteria, and a commit checkpoint.

---

### Phase 1 — Dependency audit and package.json surgery
**Goal:** Make `package.json` reflect reality and build correctly.

**Tasks:**

1.1. Remove `cors`, `helmet`, and `express-rate-limit` from the **frontend** `package.json` `dependencies`. These are server-side Node.js packages. Verify they are correctly present in `backend/package.json` (or wherever the Hono API's package.json lives). If they are missing from the backend, add them there instead.

1.2. Move `@types/file-saver` and `@types/qrcode` from `dependencies` to `devDependencies` in the frontend `package.json`.

1.3. Remove `@vitejs/plugin-react-swc` from `devDependencies` — it is unused. Confirm `vite.config.ts` only imports from `@vitejs/plugin-react`.

1.4. Replace `xlsx` v0.18.5. Evaluate `exceljs` (MIT, actively maintained) as a drop-in. Update all import sites in `src/` that reference `xlsx`. Run a build to confirm no type errors.

1.5. Add the following scripts to the frontend `package.json`:
```json
"lint": "eslint src --ext .ts,.tsx --max-warnings 0",
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

1.6. Run `npm install` and `npm run build`. Confirm the build succeeds with zero errors.

**Acceptance criteria:**
- `npm run build` exits 0 with no errors.
- `npm ls cors` and `npm ls helmet` return "empty" for the frontend package.
- `@types/*` packages appear only in `devDependencies`.
- `xlsx` no longer present; `exceljs` (or agreed replacement) present.

**Commit:** `chore: audit and correct package.json dependencies`

---

### Phase 2 — Test infrastructure setup
**Goal:** Install a test framework and write the first meaningful tests covering the highest-risk paths.

**Tasks:**

2.1. Install Vitest and testing utilities in the frontend:
```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom
```

2.2. Add a `vitest.config.ts` (or extend `vite.config.ts`) with the following configuration:
```ts
test: {
  environment: 'jsdom',
  globals: true,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    thresholds: { lines: 40, functions: 40 }   // start low, raise over time
  }
}
```

2.3. Identify the backend test setup. If `backend/package.json` has no test runner, install Vitest (or the project's preferred runner) there as well.

2.4. Write unit tests for the following — these are the highest-risk areas in a UMS:

**Frontend tests (in `src/__tests__/` or colocated):**
- Auth: test that unauthenticated routes redirect to login; test that role-restricted routes are not accessible to lower-privileged roles.
- Certificate generation: test that the QR code hash produced for a given student record is deterministic and matches the expected format.
- Form validation: test that student record forms reject empty required fields and malformed email addresses.

**Backend tests (in `backend/src/__tests__/` or colocated):**
- JWT middleware: test that requests without a token return 401; requests with an expired token return 401; requests with a valid token pass through.
- RBAC middleware: test that a `staff` role cannot reach an `admin`-only endpoint.
- Input sanitisation: test that injection-like strings in student name fields are sanitised before reaching PocketBase.

2.5. Run `npm test` in both frontend and backend. All written tests must pass.

2.6. Add a `vitest.config.ts` coverage gate: fail if line coverage drops below 40% (this will increase as tests are added).

**Acceptance criteria:**
- `npm test` passes in both frontend and backend directories.
- At least 8 test cases written across auth, RBAC, certificate, and validation paths.
- Coverage report generated.

**Commit:** `test: install Vitest and write initial test suite for auth, RBAC, and certificate paths`

---

### Phase 3 — Docker and production hardening
**Goal:** Make Docker Compose production-safe.

**Tasks:**

3.1. Audit `backend/Dockerfile`. If it does not exist, create it. The production Dockerfile must:
- Use a multi-stage build: `builder` stage installs dependencies and compiles TypeScript; `runner` stage copies only `dist/` and `node_modules` (production only).
- Run as a non-root user (`node` or a dedicated `appuser`).
- Not include any development tooling in the final image.

Example multi-stage structure:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER appuser
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

3.2. Update `docker-compose.yml` for the `api` service:
- Remove the `volumes: - ./backend:/app` source mount.
- Remove `- /app/node_modules`.
- The service now runs from the built image only.
- Keep the `./logs:/app/logs` volume if log persistence is needed.

3.3. Verify all environment variables referenced in `docker-compose.yml` have a corresponding entry in `backend/.env.example` with a descriptive comment. Add any that are missing.

3.4. Add a `.dockerignore` file to the `backend/` directory if absent:
```
node_modules
dist
.env
*.log
coverage
__tests__
```

3.5. Run `docker-compose build && docker-compose up -d` and confirm all health checks pass (`docker-compose ps` shows all services as `healthy`).

**Acceptance criteria:**
- `docker-compose up --build` completes successfully.
- All services report `healthy` in `docker-compose ps`.
- No source code is mounted into the `api` container at runtime — verify with `docker exec bmi-api ls /app` showing only compiled output.
- API container runs as non-root: `docker exec bmi-api whoami` must not return `root`.

**Commit:** `fix: production-safe Docker multi-stage build, remove source volume mount`

---

### Phase 4 — Repository hygiene
**Goal:** Clean root directory to professional standard; organise scripts; fix git setup.

**Tasks:**

4.1. Create a `scripts/` subdirectory if it does not already exist. Move the following files from root into `scripts/legacy/` (do not delete — they may still be useful for reference but should not be at root):
- `fix-and-restart.sh`
- `force-restart-backend.sh`
- `restart-backend-fixed.sh`
- `restart-backend.sh`
- `fix-pocketbase-version.sh`
- `check-all-services.sh`
- `check-pocketbase-data.sh`
- `check-services.sh`
- `run-add-mock-students.sh`
- `apply-fixes.ps1`
- `setup-pocketbase-admin.sh`
- `install-certificate-packages.sh`
- `quick-restart.sh`
- `prepare-push.sh`
- `cleanup-repo.sh`

4.2. Move these development utility files from root into `scripts/utils/`:
- `parse_excel.js`
- `generate_template.cjs`
- `test-student-api.html`

4.3. Update `scripts/README.md` to document what is supported vs legacy. The supported scripts (at root or in `scripts/`) should be only:
- `start-all.sh` — start all services
- `stop-all.sh` — stop all services
- `start-dev.sh` — start in dev mode
- `start-all.bat` / `start-all.ps1` — Windows equivalents
- `setup-scripts.sh` — first-time setup

4.4. Add a `CODEOWNERS` file at `.github/CODEOWNERS`:
```
* @KIAI-JOSEPH
```

4.5. Add branch protection rules by creating `.github/branch-protection.md` documenting the intended branch strategy for future contributors:
```markdown
# Branch strategy

- `main` — protected. Requires PR + passing CI before merge. No direct pushes.
- `develop` — integration branch. All feature branches target this.
- `feature/<name>` — individual feature work.
- `fix/<name>` — bug fixes.
- `release/<version>` — release candidates.
```

(Actual GitHub branch protection must be set in the repository Settings → Branches by an admin.)

4.6. Create a `ROADMAP.md` that includes a section titled "Scalability considerations" noting that SQLite via PocketBase is appropriate up to ~5,000 concurrent users, and that a PostgreSQL migration path should be planned before reaching that scale.

**Acceptance criteria:**
- `ls -la` at root shows ≤10 script files.
- `scripts/legacy/` exists and contains the moved scripts.
- `scripts/README.md` clearly distinguishes supported from legacy scripts.
- Build still passes: `npm run build` exits 0.

**Commit:** `chore: reorganise root scripts, add CODEOWNERS and branch strategy docs`

---

### Phase 5 — CI/CD pipeline
**Goal:** Add GitHub Actions so every push is automatically linted, tested, and built.

**Tasks:**

5.1. Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  frontend:
    name: Frontend — lint, test, build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  backend:
    name: Backend — lint, test, build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  docker:
    name: Docker build check
    runs-on: ubuntu-latest
    needs: [frontend, backend]
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build
```

5.2. Create `.github/workflows/security.yml` for dependency scanning:

```yaml
name: Security scan

on:
  schedule:
    - cron: '0 6 * * 1'   # every Monday at 06:00 UTC
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm audit --audit-level=high
      - run: cd backend && npm audit --audit-level=high
```

5.3. Ensure both workflows pass by pushing to a `ci/setup` branch and opening a draft PR against `main`. All jobs must be green before merging.

**Acceptance criteria:**
- `.github/workflows/ci.yml` exists and all three jobs (frontend, backend, docker) pass on push.
- `.github/workflows/security.yml` exists.
- No failing lint or test errors in CI.

**Commit:** `ci: add GitHub Actions workflows for lint, test, build, and security audit`

---

## 4. Security backlog (schedule after phases 1–5)

These items require design decisions and are not simple file changes. Log them as GitHub Issues after the phases above are complete.

| Issue title | Priority | Description |
|---|---|---|
| Implement JWT refresh token rotation | High | Add refresh-token endpoint in Hono API. Access tokens: 15-minute expiry. Refresh tokens: 7-day expiry, stored in HttpOnly cookie, rotated on each use. |
| Add PocketBase admin UI access control | High | Block `/_/` route in Caddy with an IP allowlist or HTTP basic auth as a secondary layer. |
| Evaluate secrets manager for production | Medium | Document how to use Docker Secrets or a HashiCorp Vault instance to supply `JWT_SECRET`, `ENCRYPTION_KEY`, and `POCKETBASE_ADMIN_PASSWORD` at runtime rather than via `.env`. |
| Document PostgreSQL migration path | Medium | Add a `docs/POSTGRES_MIGRATION.md` covering how to move PocketBase's SQLite data to a dedicated PostgreSQL instance when scale demands it. |

---

## 5. Definition of done

The remediation is complete when:

- [ ] `npm run build` passes in the frontend with zero errors or warnings.
- [ ] `npm run lint` passes in both frontend and backend with zero errors.
- [ ] `npm run test` passes in both frontend and backend with ≥ 8 test cases.
- [ ] `docker compose up --build` produces all services in `healthy` state.
- [ ] The API container does not run as root and contains no source code mounts.
- [ ] Root directory has ≤ 10 script files; all debug scripts are in `scripts/legacy/`.
- [ ] GitHub Actions CI pipeline is green on `main`.
- [ ] All four security backlog items are filed as GitHub Issues with labels.
- [ ] `ROADMAP.md` includes a scalability note for the SQLite ceiling.
- [ ] No regressions: existing features (auth, RBAC, certificate generation, audit logging, Ollama AI) behave identically to before.

---

## 6. Output format for each task

When you complete a task, respond in this format:

```
TASK [ID] — [title]
Status: DONE | BLOCKED | SKIPPED
Changes made:
  - [file path]: [one-line description of change]
  - ...
Verification: [command run] → [output or exit code]
Next: [next task ID]
```

If you encounter a BLOCKER, stop and output:
```
BLOCKER at [ID]: [clear description of the conflict or ambiguity]
Options: [option A] | [option B]
Awaiting decision before proceeding.
```

---

*Generated from BMI-PORTAL code review — repo: https://github.com/KIAI-JOSEPH/BMI-PORTAL*
