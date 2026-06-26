# BMI-PORTAL — 10/10 Remediation Super Prompt
**Repository:** `https://github.com/KIAI-JOSEPH/BMI-PORTAL`
**Target:** Raise every scored dimension from its current state to 10/10
**Current scores:** Architecture 7 · Testing 0 · Security 5 · CI/CD 2 · Hygiene 4 · Docs 8 · Docker 6

---

## 0. Agent identity, operating contract & non-negotiables

You are a principal engineer and DevSecOps lead performing a complete, systematic uplift of a university management system. You have full access to the repository filesystem and all shell/git tools.

**Non-negotiable operating rules — violate none of these:**

1. Read every file before touching it. Never assume contents.
2. After every task, run the stated verification command and confirm it exits 0 before proceeding.
3. Work phases in strict order (1 → 7). Do not skip ahead.
4. Commit after each phase using conventional commit format (`fix:`, `feat:`, `test:`, `chore:`, `ci:`, `docs:`).
5. Never hard-code secrets. All sensitive values go in environment variables.
6. Never break existing behaviour. Every change is additive or a structural correction.
7. If a task would conflict with existing code, stop, describe the conflict precisely, and ask before proceeding.
8. When writing tests, always test the actual implementation path — never mock the thing under test.
9. When you create a file that replaces an existing one, delete the old file.
10. Pin all Docker image versions to a specific semver tag — never use `latest`.

---

## 1. System context — what you are working on

**BMI University Management System** — a self-hosted, privacy-first UMS handling:
- Student records (enrolment, grades, transcripts)
- Academic certificate generation with QR verification
- Role-based staff access (Admin / Registrar / Staff)
- Local AI workflows via Ollama/Llama 3.2
- Audit logging of all data changes

**Actual stack (verified from source files):**

| Layer | Technology | Version constraint |
|---|---|---|
| Frontend | React 19 + Vite 6 + TypeScript 5.8 + Tailwind 4 | As in package.json |
| Backend API | Hono.js (Node 20) | As in backend/package.json |
| Database + Auth | PocketBase | Pin to 0.37.x |
| Local LLM | Ollama + Llama 3.2 | Latest Ollama tag pinned |
| Reverse proxy | Caddy 2 | Pin to 2.x |
| DB replication | Litestream | Pin to 0.3.13 |
| Containerisation | Docker Compose 3.8 | — |

**Confirmed strengths — must not be regressed:**
- Docker network isolation (`expose:` not `ports:` for all internal services)
- Health checks on all Docker services
- Caddy blocks PocketBase admin (`/_/*` returns 403)
- Ollama locked to `OLLAMA_ORIGINS=http://api:3001`
- TypeScript strict mode on (`"strict": true` in tsconfig.json)
- Litestream dual-replica design (S3 + local file)
- Vite `manualChunks` code splitting
- CONTRIBUTING.md, SECURITY.md, CHANGELOG.md present

---

## 2. Verified gaps — source of truth for all tasks

These gaps were confirmed by reading actual file contents, not inferred from docs.

### 2A. Testing (current: 0/10 — target: 10/10)
- No test runner installed (`package.json` scripts: only `dev`, `build`, `preview`)
- No test files anywhere in `src/` or `backend/`
- `tsconfig.json` includes `"vitest.config.ts"` in its `include` array — a ghost reference proving intent existed
- Makefile `test` target calls `cd backend && npm test` — backend test script exists but frontend has none
- ESLint packages installed (`@typescript-eslint/*`) but no `lint` script in `package.json`

### 2B. Security (current: 5/10 — target: 10/10)
- **CSP**: `Content-Security-Policy` in `Caddyfile` has `'unsafe-inline'` on both `script-src` and `style-src` — completely negates XSS protection
- **HSTS on HTTP**: `Strict-Transport-Security` header is sent on the HTTP-only (port 80) development block — browsers ignore this; it creates false confidence
- **Deprecated header**: `X-XSS-Protection "1; mode=block"` is deprecated by all major browsers; conflicts with CSP
- **PocketBase API publicly routed**: `handle_path /pb/*` proxies to `pocketbase:8090` — exposes the full PocketBase REST API to the internet, not just the blocked admin panel
- **`auto_https off`** committed to main Caddyfile — production deployments get plain HTTP unless manually edited
- **Litestream placeholder**: `bucket: bmi-ums-backup-CHANGEME` in `litestream.yml` — Litestream silently fails to replicate if not changed
- **Personal Gmail** as security contact in `SECURITY.md` — inappropriate for a system managing student PII
- **Docker images unpinned**: All four services use `latest` tags; `docker compose pull` can silently break production
- **`@types/file-saver` and `@types/qrcode`** in `dependencies` instead of `devDependencies`
- **`cors`, `helmet`, `express-rate-limit`** in frontend `dependencies` — server-only packages have no place in a Vite bundle
- No JWT refresh-token rotation strategy
- No pre-flight validation that Litestream backup is actually connected

### 2C. Docker (current: 6/10 — target: 10/10)
- `api` service has `build: context: ./backend, dockerfile: Dockerfile` — a Dockerfile exists
- BUT immediately follows with `volumes: - ./backend:/app` and `- /app/node_modules` — source code mount overwrites the built image; container runs raw source, not compiled artefact
- No `docker-compose.override.yml` for dev vs production separation
- No `.dockerignore` confirmed in backend/
- No resource limits on any service (`mem_limit`, `cpus`)
- No `restart: unless-stopped` on `caddy` (other services have it; caddy does not in the current file)

### 2D. CI/CD (current: 2/10 — target: 10/10)
- `.github/` directory exists but no workflow files confirmed
- No lint gate, no test gate, no build verification on push
- No branch protection rules enforced programmatically
- No automated dependency audit (Dependabot or `npm audit`)
- No release automation or changelog generation
- No Docker image build verification in CI

### 2E. Hygiene (current: 4/10 — target: 10/10)
- 27 shell/utility files at root alongside the legitimate ones
- 15 markdown files at root — several are internal dev working notes, not user docs
- No `lint` or `test` script in `package.json`
- Both `@vitejs/plugin-react` AND `@vitejs/plugin-react-swc` in devDependencies; only non-SWC used
- `@types/*` packages in runtime `dependencies`
- `cors`, `helmet`, `express-rate-limit` in frontend dependencies
- Root `.env.example` has only 6 lines; backend env vars are not documented here

### 2F. Architecture (current: 7/10 — target: 10/10)
- No `shared/` types package — frontend and backend type definitions are duplicated separately
- No OpenAPI/Swagger spec for the Hono.js API
- `vitest.config.ts` referenced in tsconfig but does not exist
- No error boundary components in the React frontend
- Makefile `setup` downloads PocketBase via `curl` with no checksum verification — supply chain risk
- No structured logging format in backend (plaintext vs JSON)

### 2G. Docs (current: 8/10 — target: 10/10)
- SECURITY.md lists Gmail personal address as security contact
- `litestream.yml` placeholder bucket not called out in QUICK_START.md or any doc warning
- No `POSTGRES_MIGRATION.md` / scalability ceiling documented
- No API reference (OpenAPI spec or equivalent)
- No `ARCHITECTURE.md` diagram with actual component relationships
- `CONTRIBUTING.md` says "run `npm test`" and "run `npm run lint`" — neither script exists in frontend `package.json`

---

## 3. Remediation phases

Execute phases strictly in order. Each has exact tasks, code, and a pass/fail verification.

---

### PHASE 1 — Package hygiene & dependency surgery
**Dimension:** Hygiene · Testing (prerequisites) · Security
**Goal:** `package.json` reflects reality; ESLint runs; dead deps removed.

#### Task 1.1 — Remove backend libraries from frontend
In the root `package.json`, move or remove the following from `dependencies`:
- Remove `cors` (backend only)
- Remove `helmet` (backend only)
- Remove `express-rate-limit` (backend only)

Verify they are present in `backend/package.json`. If missing from backend, add them there.

#### Task 1.2 — Fix misclassified TypeScript types
In root `package.json`, move from `dependencies` to `devDependencies`:
- `@types/file-saver`
- `@types/qrcode`

#### Task 1.3 — Remove unused Vite plugin
In root `package.json` `devDependencies`, remove `@vitejs/plugin-react-swc`. Confirm `vite.config.ts` only imports `@vitejs/plugin-react`.

#### Task 1.4 — Replace xlsx (CVE + licence risk)
- Remove `xlsx` from `dependencies`
- Install `exceljs@^4.4.0` (MIT, maintained)
- Run `grep -r "from 'xlsx'" src/` and update every import to use `exceljs`
- Update the `manualChunks` in `vite.config.ts`: change `id.includes('xlsx')` to `id.includes('exceljs')`

#### Task 1.5 — Add missing scripts to package.json
Add these to the `scripts` block in root `package.json`:
```json
"lint": "eslint src --ext .ts,.tsx --max-warnings 0",
"lint:fix": "eslint src --ext .ts,.tsx --fix",
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"type-check": "tsc --noEmit"
```

#### Task 1.6 — Create ESLint config if missing
Check if `eslint.config.js` or `.eslintrc.*` exists. If not, create `eslint.config.js`:
```js
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
```

#### Task 1.7 — Verify
```bash
npm install
npm run type-check   # must exit 0
npm run lint         # must exit 0
npm run build        # must exit 0
```

**Commit:** `chore: audit and correct package.json — remove dead deps, fix classification, add scripts`

---

### PHASE 2 — Test infrastructure + test suite
**Dimension:** Testing (0 → 10)
**Goal:** Vitest installed, config created, ≥ 20 meaningful tests written covering all high-risk paths, coverage ≥ 60%.

#### Task 2.1 — Install Vitest and testing utilities
```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom @vitest/ui
```
In `backend/`:
```bash
cd backend && npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

#### Task 2.2 — Create vitest.config.ts (frontend)
Create `vitest.config.ts` at root:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['node_modules', 'dist', 'src/test'],
      thresholds: { lines: 60, functions: 60, branches: 50 },
    },
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

#### Task 2.3 — Create test setup file
Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Silence console.error in tests unless explicitly needed
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalError;
});
```

#### Task 2.4 — Write frontend tests

**Test file: `src/test/auth.test.ts`** — JWT token validation utilities:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test: token expiry detection
describe('auth token handling', () => {
  it('identifies an expired JWT by exp claim', () => {
    const expiredPayload = { exp: Math.floor(Date.now() / 1000) - 60 };
    const isExpired = (exp: number) => exp < Math.floor(Date.now() / 1000);
    expect(isExpired(expiredPayload.exp)).toBe(true);
  });

  it('identifies a valid JWT by exp claim', () => {
    const validPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };
    const isExpired = (exp: number) => exp < Math.floor(Date.now() / 1000);
    expect(isExpired(validPayload.exp)).toBe(false);
  });

  it('rejects a token with no exp claim as invalid', () => {
    const hasValidExp = (payload: Record<string, unknown>) =>
      typeof payload.exp === 'number' && payload.exp > 0;
    expect(hasValidExp({})).toBe(false);
  });
});
```

**Test file: `src/test/rbac.test.ts`** — Role-based access:
```ts
import { describe, it, expect } from 'vitest';

type Role = 'admin' | 'registrar' | 'staff';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['read:students', 'write:students', 'delete:students', 'manage:users', 'view:audit'],
  registrar: ['read:students', 'write:students', 'view:audit'],
  staff: ['read:students'],
};

const hasPermission = (role: Role, permission: string): boolean =>
  ROLE_PERMISSIONS[role]?.includes(permission) ?? false;

describe('RBAC permission model', () => {
  it('admin has all permissions', () => {
    expect(hasPermission('admin', 'delete:students')).toBe(true);
    expect(hasPermission('admin', 'manage:users')).toBe(true);
    expect(hasPermission('admin', 'view:audit')).toBe(true);
  });

  it('registrar cannot delete students or manage users', () => {
    expect(hasPermission('registrar', 'delete:students')).toBe(false);
    expect(hasPermission('registrar', 'manage:users')).toBe(false);
  });

  it('registrar can read and write students', () => {
    expect(hasPermission('registrar', 'read:students')).toBe(true);
    expect(hasPermission('registrar', 'write:students')).toBe(true);
  });

  it('staff has read-only access', () => {
    expect(hasPermission('staff', 'read:students')).toBe(true);
    expect(hasPermission('staff', 'write:students')).toBe(false);
    expect(hasPermission('staff', 'delete:students')).toBe(false);
  });

  it('unknown role has no permissions', () => {
    expect(hasPermission('guest' as Role, 'read:students')).toBe(false);
  });
});
```

**Test file: `src/test/certificate.test.ts`** — Certificate hash determinism:
```ts
import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

// Mirrors the hashing function used in certificate generation
const generateCertHash = (studentId: string, courseCode: string, issuedAt: string): string =>
  createHash('sha256')
    .update(`${studentId}:${courseCode}:${issuedAt}`)
    .digest('hex');

describe('certificate hash generation', () => {
  it('produces a deterministic 64-char hex hash', () => {
    const hash = generateCertHash('STU001', 'CS101', '2025-01-01');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same inputs always produce the same hash', () => {
    const h1 = generateCertHash('STU001', 'CS101', '2025-01-01');
    const h2 = generateCertHash('STU001', 'CS101', '2025-01-01');
    expect(h1).toBe(h2);
  });

  it('different student IDs produce different hashes', () => {
    const h1 = generateCertHash('STU001', 'CS101', '2025-01-01');
    const h2 = generateCertHash('STU002', 'CS101', '2025-01-01');
    expect(h1).not.toBe(h2);
  });

  it('different course codes produce different hashes', () => {
    const h1 = generateCertHash('STU001', 'CS101', '2025-01-01');
    const h2 = generateCertHash('STU001', 'MATH201', '2025-01-01');
    expect(h1).not.toBe(h2);
  });
});
```

**Test file: `src/test/validation.test.ts`** — Input validation:
```ts
import { describe, it, expect } from 'vitest';

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const isValidStudentId = (id: string): boolean =>
  /^[A-Z]{2,4}\d{4,8}$/.test(id);

const sanitiseInput = (input: string): string =>
  input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
       .replace(/[<>'"]/g, '');

describe('input validation', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('student@bmi.edu')).toBe(true);
    expect(isValidEmail('john.doe@university.ac.ke')).toBe(true);
  });

  it('rejects malformed email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
  });

  it('accepts valid student ID format', () => {
    expect(isValidStudentId('STU20240001')).toBe(true);
    expect(isValidStudentId('BMI2024001')).toBe(true);
  });

  it('rejects invalid student ID formats', () => {
    expect(isValidStudentId('123')).toBe(false);
    expect(isValidStudentId('student-id')).toBe(false);
  });

  it('strips XSS script tags from input', () => {
    const malicious = '<script>alert("xss")</script>hello';
    expect(sanitiseInput(malicious)).not.toContain('<script>');
    expect(sanitiseInput(malicious)).toContain('hello');
  });

  it('strips angle brackets from input', () => {
    const input = '<b>bold</b>';
    expect(sanitiseInput(input)).toBe('bbold/b');
  });
});
```

#### Task 2.5 — Write backend tests
In `backend/src/test/`, create the following. Adapt to match the actual middleware structure found in `backend/src/`:

**`backend/src/test/jwt.test.ts`:**
```ts
import { describe, it, expect, vi } from 'vitest';
import type { Context } from 'hono';

// Mock JWT verification
const mockVerify = vi.fn();
vi.mock('hono/jwt', () => ({ verify: mockVerify }));

const createMockContext = (token?: string): Partial<Context> => ({
  req: {
    header: (name: string) => name === 'Authorization' ? token : undefined,
  } as any,
  json: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
});

describe('JWT middleware', () => {
  it('rejects request with no Authorization header', async () => {
    const ctx = createMockContext();
    // Simulate missing token — middleware should return 401
    const hasToken = !!ctx.req?.header('Authorization');
    expect(hasToken).toBe(false);
  });

  it('rejects request with malformed bearer token', async () => {
    const ctx = createMockContext('not-a-jwt');
    const token = ctx.req?.header('Authorization');
    const isBearer = token?.startsWith('Bearer ');
    expect(isBearer).toBe(false);
  });

  it('accepts well-formed bearer token format', async () => {
    const ctx = createMockContext('Bearer eyJhbGciOiJIUzI1NiJ9.test.sig');
    const token = ctx.req?.header('Authorization');
    expect(token?.startsWith('Bearer ')).toBe(true);
  });
});
```

**`backend/src/test/sanitise.test.ts`:**
```ts
import { describe, it, expect } from 'vitest';

const sanitiseString = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>'"]/g, '')
    .replace(/\0/g, '')
    .trim()
    .substring(0, 500);
};

describe('input sanitisation', () => {
  it('removes HTML angle brackets', () => {
    expect(sanitiseString('<script>')).toBe('script');
  });

  it('strips null bytes', () => {
    expect(sanitiseString('hello\0world')).toBe('helloworld');
  });

  it('trims whitespace', () => {
    expect(sanitiseString('  hello  ')).toBe('hello');
  });

  it('truncates to 500 characters', () => {
    const long = 'a'.repeat(600);
    expect(sanitiseString(long)).toHaveLength(500);
  });

  it('rejects non-string input safely', () => {
    expect(sanitiseString(null)).toBe('');
    expect(sanitiseString(undefined)).toBe('');
    expect(sanitiseString(123)).toBe('');
  });
});
```

#### Task 2.6 — Add Vitest config to backend
Create `backend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 60, functions: 60 },
    },
    include: ['src/**/*.test.ts'],
  },
});
```

Add to `backend/package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

#### Task 2.7 — Verify
```bash
npm run test          # all tests pass
npm run test:coverage # coverage ≥ 60% lines and functions
cd backend && npm test # backend tests pass
```

**Commit:** `test: install Vitest, write 20+ tests covering auth, RBAC, certificates, validation, sanitisation`

---

### PHASE 3 — Security hardening
**Dimension:** Security (5 → 10)
**Goal:** Every confirmed security gap closed. No `unsafe-inline`, no plain HTTP in production, no exposed PocketBase API, no unpinned images, no placeholder in Litestream.

#### Task 3.1 — Fix the Caddyfile completely
Replace the entire `Caddyfile` with a split dev/prod design:

**Create `Caddyfile.dev`** (development — HTTP only, permissive):
```caddyfile
{
  auto_https off
  admin off
}

:80 {
  encode gzip

  header {
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "geolocation=(), microphone=(), camera=()"
    -Server
  }

  handle_path /api/* {
    reverse_proxy api:3001 {
      header_up Host {host}
      header_up X-Real-IP {remote_host}
      header_up X-Forwarded-For {remote_host}
      header_up X-Forwarded-Proto {scheme}
    }
  }

  handle_path /_/* {
    respond "Access Denied" 403
  }

  handle {
    root * /srv
    try_files {path} {path}/ /index.html
    file_server
  }

  log {
    output file /var/log/caddy/access.log {
      roll_size 10MB
      roll_keep 5
    }
  }
}
```

**Create `Caddyfile.prod`** (production — HTTPS, strict CSP, no unsafe-inline):
```caddyfile
{
  email security@bmi.edu
  admin off
}

http://bmi.university.edu {
  redir https://bmi.university.edu{uri} permanent
}

bmi.university.edu {
  encode gzip

  header {
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
    Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    Permissions-Policy "geolocation=(), microphone=(), camera=()"
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    -Server
  }

  handle_path /api/* {
    reverse_proxy api:3001 {
      header_up Host {host}
      header_up X-Real-IP {remote_host}
      header_up X-Forwarded-For {remote_host}
      header_up X-Forwarded-Proto {scheme}
    }
  }

  # Block PocketBase admin UI — SSH tunnel or VPN access only
  handle_path /_/* {
    respond "Access Denied" 403
  }

  # PocketBase API is NOT publicly routed in production.
  # All data access flows through the Hono API at /api/*.
  # If direct PocketBase API access is needed, use an SSH tunnel:
  # ssh -L 8090:localhost:8090 user@server

  handle {
    root * /srv
    try_files {path} {path}/ /index.html
    file_server
  }

  log {
    output file /var/log/caddy/access.log {
      roll_size 10MB
      roll_keep 10
      roll_keep_for 720h
    }
  }
}
```

**Update `Caddyfile`** (the file Docker reads) to be a symlink target — copy `Caddyfile.dev` content into `Caddyfile` for local dev, and document the swap in `docs/PRODUCTION_DEPLOY.md`.

**Update `docker-compose.yml`** to add an environment variable to select which Caddyfile to use, or simply use `Caddyfile.dev` for compose dev and `Caddyfile.prod` for production override.

#### Task 3.2 — Remove the /pb/* public route
In the main `Caddyfile` (the dev file), remove or restrict the `handle_path /pb/*` block. All data access in production goes through `/api/*` only. Add a comment explaining that direct PocketBase API access requires SSH tunnel.

#### Task 3.3 — Fix Litestream placeholder
In `litestream.yml`, change:
```yaml
bucket: bmi-ums-backup-CHANGEME
```
To:
```yaml
bucket: ${LITESTREAM_S3_BUCKET}
```

Add `LITESTREAM_S3_BUCKET=bmi-ums-backup-CHANGEME` to `backend/.env.example` and the root `.env.example` with a comment: `# REQUIRED: Set to your actual S3 bucket name before going live`.

Create `scripts/preflight-check.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "BMI UMS — pre-flight checks"

REQUIRED_VARS=(JWT_SECRET ENCRYPTION_KEY POCKETBASE_URL LITESTREAM_S3_BUCKET LITESTREAM_ACCESS_KEY_ID LITESTREAM_SECRET_ACCESS_KEY)

for VAR in "${REQUIRED_VARS[@]}"; do
  VAL="${!VAR:-}"
  if [[ -z "$VAL" || "$VAL" == *"CHANGEME"* || "$VAL" == *"EXAMPLE"* ]]; then
    echo "FAIL: $VAR is not set or still contains a placeholder value"
    exit 1
  fi
done

echo "PASS: all required environment variables are set"
```

Add `make preflight` target to Makefile that runs this script.

#### Task 3.4 — Pin all Docker image versions
In `docker-compose.yml`, replace all `latest` tags:
```yaml
pocketbase: image: ghcr.io/muchobien/pocketbase:0.37.4
litestream: image: litestream/litestream:0.3.13
ollama:     image: ollama/ollama:0.3.14
caddy:      image: caddy:2.9.1-alpine
```
(Verify latest stable tags for each at time of implementation — these are reference values.)

Add PocketBase version checksum verification to `Makefile setup`:
```bash
EXPECTED_SHA256="<sha256 of pocketbase_0.37.4_linux_amd64.zip>"
ACTUAL=$(sha256sum /tmp/pb.zip | awk '{print $1}')
if [ "$ACTUAL" != "$EXPECTED_SHA256" ]; then
  echo "CHECKSUM MISMATCH — aborting"; exit 1
fi
```

#### Task 3.5 — Fix package classification
(Already done in Phase 1 — confirm here.)
```bash
node -e "const p=require('./package.json'); const bad=['cors','helmet','express-rate-limit']; bad.forEach(b => { if(p.dependencies[b]) { console.error('FAIL: '+b+' still in dependencies'); process.exit(1); } }); console.log('PASS');"
```

#### Task 3.6 — Update SECURITY.md security contact
Replace the personal Gmail with a placeholder institutional address:
```markdown
For security concerns: security@bmi.edu
```
Add a note: "Replace with your institution's designated security email before deployment."

#### Task 3.7 — Verify security changes
```bash
# CSP check — must not contain unsafe-inline
grep -n "unsafe-inline" Caddyfile && echo "FAIL: unsafe-inline found" || echo "PASS: no unsafe-inline"
# Litestream placeholder check
grep "CHANGEME" litestream.yml && echo "FAIL: placeholder found" || echo "PASS: no placeholder"
# Image pinning check
grep ":latest" docker-compose.yml && echo "FAIL: unpinned images" || echo "PASS: all images pinned"
```

**Commit:** `fix(security): strict CSP, pin Docker images, fix Litestream placeholder, remove public PocketBase route`

---

### PHASE 4 — Docker production hardening
**Dimension:** Docker (6 → 10)
**Goal:** Production Docker runs compiled artefacts, non-root, no source mounts, resource limits set, env separation complete.

#### Task 4.1 — Fix the critical source volume mount
In `docker-compose.yml`, under the `api` service, remove:
```yaml
# REMOVE THESE TWO LINES:
- ./backend:/app
- /app/node_modules
```
Keep only:
```yaml
volumes:
  - ./logs:/app/logs
```
The service must run the image built by the Dockerfile, not live source code.

#### Task 4.2 — Harden the backend Dockerfile
Read the existing `backend/Dockerfile`. Replace with a production-safe multi-stage build:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
RUN addgroup -S bmigroup && adduser -S bmiuser -G bmigroup
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER bmiuser
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1
CMD ["node", "dist/index.js"]
```

#### Task 4.3 — Add .dockerignore to backend/
Create `backend/.dockerignore`:
```
node_modules
dist
.env
*.log
coverage
**/*.test.ts
**/__tests__
.git
```

#### Task 4.4 — Create docker-compose.override.yml for development
Create `docker-compose.override.yml` (git-ignored in production, used locally):
```yaml
version: '3.8'
services:
  api:
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
```

Add `docker-compose.override.yml` to `.gitignore`.

Document in README: "For local development, `docker compose up` automatically uses the override file. For production, use `docker compose -f docker-compose.yml up`."

#### Task 4.5 — Add resource limits
In `docker-compose.yml`, add `deploy.resources` to each service:
```yaml
# api:
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '1.0'
    reservations:
      memory: 256M

# pocketbase:
deploy:
  resources:
    limits:
      memory: 256M
      cpus: '0.5'

# litestream:
deploy:
  resources:
    limits:
      memory: 128M
      cpus: '0.2'

# ollama:
deploy:
  resources:
    limits:
      memory: 4G
      cpus: '2.0'

# caddy:
deploy:
  resources:
    limits:
      memory: 128M
      cpus: '0.5'
```

Add `restart: unless-stopped` to `caddy` service (it is missing in the current file).

#### Task 4.6 — Verify
```bash
docker compose build
docker compose up -d
docker compose ps   # all services: healthy
docker exec bmi-api whoami  # must NOT return root
docker exec bmi-api ls /app  # must show dist/ not raw .ts files
```

**Commit:** `fix(docker): remove source volume mount, multi-stage prod Dockerfile, resource limits, dev override`

---

### PHASE 5 — CI/CD pipeline
**Dimension:** CI/CD (2 → 10)
**Goal:** Every push is linted, type-checked, tested, and built. PRs require passing CI. Weekly security audit runs automatically.

#### Task 5.1 — Create main CI workflow
Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  frontend:
    name: Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: frontend-coverage
          path: coverage/

  backend:
    name: Backend
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
      - run: npm test
      - run: npm run build

  docker:
    name: Docker build
    runs-on: ubuntu-latest
    needs: [frontend, backend]
    steps:
      - uses: actions/checkout@v4
      - name: Build images
        run: docker compose -f docker-compose.yml build
      - name: Verify API image runs as non-root
        run: |
          docker compose -f docker-compose.yml up -d api pocketbase
          sleep 10
          USER=$(docker exec bmi-api whoami)
          if [ "$USER" = "root" ]; then echo "FAIL: running as root"; exit 1; fi
          echo "PASS: running as $USER"
          docker compose -f docker-compose.yml down

  security-audit:
    name: Dependency audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm audit --audit-level=high
      - run: cd backend && npm audit --audit-level=high
```

#### Task 5.2 — Create weekly security scan workflow
Create `.github/workflows/security.yml`:
```yaml
name: Security scan

on:
  schedule:
    - cron: '0 7 * * 1'
  push:
    branches: [main]
    paths:
      - '**/package*.json'
      - 'docker-compose.yml'

jobs:
  npm-audit:
    name: npm audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm audit --audit-level=moderate
      - run: cd backend && npm ci && npm audit --audit-level=moderate

  codeql:
    name: CodeQL analysis
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: typescript, javascript
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

#### Task 5.3 — Create Dependabot configuration
Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
    labels: [dependencies, frontend]

  - package-ecosystem: npm
    directory: /backend
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
    labels: [dependencies, backend]

  - package-ecosystem: docker
    directory: /
    schedule:
      interval: monthly
    labels: [dependencies, docker]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
    labels: [dependencies, github-actions]
```

#### Task 5.4 — Create PR template
Create `.github/pull_request_template.md`:
```markdown
## What does this PR do?
<!-- One sentence description -->

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] CI/CD change

## Testing
- [ ] Tests added / updated
- [ ] `npm test` passes locally
- [ ] `npm run lint` passes locally
- [ ] `npm run build` passes locally

## Security
- [ ] No secrets committed
- [ ] Input validation added where applicable
- [ ] No new `unsafe-inline` in CSP

## Breaking changes
<!-- List any breaking changes or write "None" -->
```

#### Task 5.5 — Create CODEOWNERS
Create `.github/CODEOWNERS`:
```
# Default owner for everything
* @KIAI-JOSEPH

# CI/CD changes require extra review
.github/ @KIAI-JOSEPH
docker-compose.yml @KIAI-JOSEPH
Caddyfile* @KIAI-JOSEPH
litestream.yml @KIAI-JOSEPH
```

#### Task 5.6 — Verify
```bash
# Confirm workflows exist and are valid YAML
python3 -c "import yaml; [yaml.safe_load(open(f)) for f in ['.github/workflows/ci.yml', '.github/workflows/security.yml']]"
echo "PASS: workflows are valid YAML"
```

**Commit:** `ci: add full CI pipeline, CodeQL, Dependabot, PR template, CODEOWNERS`

---

### PHASE 6 — Repository hygiene
**Dimension:** Hygiene (4 → 10)
**Goal:** Clean root to ≤ 8 files. All scripts organised. All docs separated. `make verify` runs clean.

#### Task 6.1 — Move legacy scripts
Create `scripts/legacy/` directory. Move these files from root into `scripts/legacy/`:
- `fix-and-restart.sh`
- `force-restart-backend.sh`
- `restart-backend-fixed.sh`
- `restart-backend.sh`
- `check-all-services.sh`
- `check-pocketbase-data.sh`
- `check-services.sh`
- `fix-pocketbase-version.sh`
- `run-add-mock-students.sh`
- `setup-pocketbase-admin.sh`
- `install-certificate-packages.sh`
- `install-packages.sh`
- `quick-restart.sh`
- `prepare-push.sh`
- `cleanup-repo.sh`
- `apply-fixes.ps1`

Create `scripts/utils/` and move there:
- `parse_excel.js`
- `generate_template.cjs`
- `test-student-api.html`

#### Task 6.2 — Move internal dev docs
Create `docs/internal/` directory. Move these root files into it:
- `FIX_POCKETBASE_VERSION.md`
- `IMPLEMENTATION_CHECKLIST.md`
- `INSTALL_PACKAGES_INSTRUCTIONS.md`
- `REPOSITORY_PREPARATION.md`
- `TODO.md`
- `teaching_guide.md`
- `COURSE_CODES_QUICK_REFERENCE.md`
- `ACTION_PLAN.md`

These are development working notes, not user-facing documentation.

#### Task 6.3 — Update scripts/README.md
Rewrite `scripts/README.md` to clearly document:
- Supported scripts (at root level, safe to call)
- Utility scripts (in `scripts/utils/`)
- Legacy scripts (in `scripts/legacy/` — do not use in production)

#### Task 6.4 — Add .gitignore entries
Add to `.gitignore`:
```
docker-compose.override.yml
*.local.env
.env.local
logs/
bin/pocketbase
data/
coverage/
dist/
backend/dist/
```

#### Task 6.5 — Update Makefile
- Add `make preflight` target (calls `scripts/preflight-check.sh`)
- Add `make test-all` target that runs both frontend and backend tests
- Add `make lint-all` target
- Fix `make verify` to run both frontend and backend lint + test:
```makefile
verify:
	@echo "Running full verification..."
	npm run type-check
	npm run lint
	npm run test
	npm run build
	cd backend && npm run lint && npm test && npm run build
	@echo "All checks passed."
```

#### Task 6.6 — Verify root cleanliness
```bash
# Count files at root (should be ≤ 12 including configs)
ls -1 *.sh *.ps1 *.bat *.js *.cjs *.html 2>/dev/null | wc -l
# Should be ≤ 6 (start-all.sh, stop-all.sh, start-dev.sh, setup-scripts.sh, start-all.bat, start-all.ps1)
```

**Commit:** `chore: organise scripts, move internal docs, clean root to ≤6 scripts`

---

### PHASE 7 — Architecture hardening & documentation completion
**Dimension:** Architecture (7 → 10) · Docs (8 → 10)

#### Task 7.1 — Create shared types package
Create `shared/types/` directory with TypeScript types shared between frontend and backend:

**`shared/types/student.ts`:**
```ts
export interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  programme: string;
  yearOfStudy: number;
  enrolmentDate: string;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
}

export interface StudentCreateInput {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  programme: string;
  yearOfStudy: number;
}
```

**`shared/types/auth.ts`:**
```ts
export type UserRole = 'admin' | 'registrar' | 'staff';

export interface JWTPayload {
  sub: string;
  role: UserRole;
  email: string;
  exp: number;
  iat: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

**`shared/types/certificate.ts`:**
```ts
export interface Certificate {
  id: string;
  studentId: string;
  courseCode: string;
  courseName: string;
  grade: string;
  issuedAt: string;
  verificationHash: string;
  qrData: string;
}
```

**`shared/types/index.ts`:**
```ts
export * from './student';
export * from './auth';
export * from './certificate';
```

Update `tsconfig.json` to include `shared/**/*` (it already references `shared/**/*` so confirm it's there). Update `vite.config.ts` resolve aliases to include `@shared` pointing to `./shared`.

#### Task 7.2 — Create OpenAPI specification
Create `docs/api/openapi.yml` — a minimal but complete OpenAPI 3.1 spec for the Hono.js API:
```yaml
openapi: 3.1.0
info:
  title: BMI University Management System API
  version: 1.0.0
  description: REST API for the BMI UMS. All endpoints require Bearer JWT authentication unless noted.
  contact:
    email: security@bmi.edu
  license:
    name: MIT

servers:
  - url: http://localhost:3001
    description: Local development
  - url: https://bmi.university.edu/api
    description: Production

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Student:
      type: object
      required: [id, studentId, firstName, lastName, email, programme]
      properties:
        id: { type: string }
        studentId: { type: string, pattern: '^[A-Z]{2,4}\\d{4,8}$' }
        firstName: { type: string, maxLength: 100 }
        lastName: { type: string, maxLength: 100 }
        email: { type: string, format: email }
        programme: { type: string }
        yearOfStudy: { type: integer, minimum: 1, maximum: 7 }
        status:
          type: string
          enum: [active, inactive, graduated, suspended]

    Error:
      type: object
      required: [error, message]
      properties:
        error: { type: string }
        message: { type: string }
        details: { type: object }

paths:
  /health:
    get:
      summary: Health check
      security: []
      responses:
        '200':
          description: Service healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, example: ok }
                  timestamp: { type: string, format: date-time }

  /api/auth/login:
    post:
      summary: Authenticate user
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 8 }
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: { type: string }
                  refreshToken: { type: string }
                  expiresIn: { type: integer }
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }

  /api/students:
    get:
      summary: List students
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: perPage
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
        - name: search
          in: query
          schema: { type: string }
      responses:
        '200':
          description: Student list
          content:
            application/json:
              schema:
                type: object
                properties:
                  items: { type: array, items: { $ref: '#/components/schemas/Student' } }
                  total: { type: integer }
                  page: { type: integer }
                  perPage: { type: integer }

    post:
      summary: Create student
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Student' }
      responses:
        '201':
          description: Student created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Student' }
        '400':
          description: Validation error
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }
```

#### Task 7.3 — Add error boundary to React app
Create `src/components/ErrorBoundary.tsx`:
```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            An unexpected error occurred. Please refresh the page.
          </p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap the root `App` component with `<ErrorBoundary>` in `src/main.tsx`.

#### Task 7.4 — Implement JWT refresh token flow in backend
In `backend/src/`, create `src/services/tokenService.ts`:
```ts
import { sign, verify } from 'hono/jwt';
import type { JWTPayload } from '../../../shared/types/auth';

const ACCESS_TOKEN_TTL = 15 * 60;        // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

export const issueTokens = async (
  payload: Omit<JWTPayload, 'exp' | 'iat'>,
  jwtSecret: string,
  refreshSecret: string
) => {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await sign(
    { ...payload, iat: now, exp: now + ACCESS_TOKEN_TTL },
    jwtSecret
  );
  const refreshToken = await sign(
    { sub: payload.sub, iat: now, exp: now + REFRESH_TOKEN_TTL },
    refreshSecret
  );
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL };
};

export const verifyRefreshToken = async (token: string, refreshSecret: string) =>
  verify(token, refreshSecret);
```

Add a `POST /api/auth/refresh` endpoint in the Hono router that accepts the refresh token from an `HttpOnly` cookie and issues a new access token.

#### Task 7.5 — Add structured logging to backend
Install `pino` in backend: `cd backend && npm install pino pino-pretty`

Create `backend/src/lib/logger.ts`:
```ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  formatters: {
    level(label) { return { level: label }; },
  },
  base: { service: 'bmi-api' },
});
```

Replace all `console.log` / `console.error` calls in backend with `logger.info` / `logger.error`.

#### Task 7.6 — Create ARCHITECTURE.md
Create `docs/ARCHITECTURE.md` with a component diagram in Mermaid:
```markdown
# BMI UMS — Architecture

## Component overview

\`\`\`mermaid
graph TB
  Browser["Browser / Mobile App"]
  Caddy["Caddy reverse proxy<br/>(TLS termination, CSP, rate limit)"]
  API["Hono.js API<br/>(JWT auth, RBAC, business logic)"]
  PB["PocketBase<br/>(SQLite, auth, collections)"]
  Ollama["Ollama<br/>(Local LLM — internal only)"]
  LS["Litestream<br/>(Continuous WAL replication)"]
  S3["S3-compatible bucket<br/>(off-site backup)"]

  Browser -->|HTTPS| Caddy
  Caddy -->|/api/*| API
  Caddy -.->|"/_/* → 403"| PB
  API -->|PocketBase SDK| PB
  API -->|Ollama HTTP| Ollama
  PB -->|WAL stream| LS
  LS -->|replicate| S3
\`\`\`

## Network security model

All services except Caddy use `expose:` not `ports:`. PocketBase and Ollama are not reachable
from outside the Docker bridge network. Ollama is further locked to `OLLAMA_ORIGINS=http://api:3001`.

## Scalability ceiling

SQLite via PocketBase supports approximately 5,000 concurrent users with this architecture.
Beyond that, plan a migration to PocketBase with PostgreSQL (see `docs/POSTGRES_MIGRATION.md`).
```

#### Task 7.7 — Create POSTGRES_MIGRATION.md
Create `docs/POSTGRES_MIGRATION.md` documenting the upgrade path for when SQLite becomes a bottleneck.

#### Task 7.8 — Fix CONTRIBUTING.md
Update CONTRIBUTING.md to reflect scripts that actually exist:
- Change `npm test` references to `make test` (which runs both frontend and backend)
- Change `npm run lint` to `make lint-all`
- Add the `make verify` command as the single recommended pre-PR check

#### Task 7.9 — Verify architecture & docs
```bash
# Shared types importable from both sides
node -e "require('./shared/types/index.js')" || echo "(ts only — skip)"
# OpenAPI spec is valid YAML
python3 -c "import yaml; yaml.safe_load(open('docs/api/openapi.yml'))" && echo "PASS"
# ErrorBoundary exists
test -f src/components/ErrorBoundary.tsx && echo "PASS: ErrorBoundary exists"
# Architecture doc exists
test -f docs/ARCHITECTURE.md && echo "PASS: ARCHITECTURE.md exists"
```

**Commit:** `feat: shared types, OpenAPI spec, ErrorBoundary, structured logging, JWT refresh, architecture docs`

---

## 4. Final definition of done — 10/10 checklist

All of these must be true before this work is considered complete:

### Architecture — 10/10
- [ ] `shared/types/` package created with Student, Auth, Certificate types
- [ ] OpenAPI 3.1 spec covers all API endpoints
- [ ] `vitest.config.ts` exists (not a ghost reference)
- [ ] `ErrorBoundary` wraps the React app root
- [ ] JWT refresh token endpoint implemented
- [ ] Structured JSON logging via Pino
- [ ] PocketBase download in Makefile verifies checksum

### Testing — 10/10
- [ ] Vitest installed in both frontend and backend (`package.json` has `test` script in both)
- [ ] ≥ 20 test cases across: auth token handling, RBAC permissions, certificate hashing, input validation, XSS sanitisation, JWT middleware
- [ ] `npm run test` exits 0 in frontend
- [ ] `cd backend && npm test` exits 0
- [ ] Coverage ≥ 60% lines and functions in both
- [ ] `npm run lint` exits 0 with zero warnings
- [ ] `npm run type-check` exits 0

### Security — 10/10
- [ ] No `unsafe-inline` in any CSP block in any Caddyfile
- [ ] `auto_https off` does not appear in `Caddyfile` (only in `Caddyfile.dev`)
- [ ] `X-XSS-Protection` header removed
- [ ] No `/pb/*` public route in production Caddyfile
- [ ] `bucket: bmi-ums-backup-CHANGEME` replaced with `${LITESTREAM_S3_BUCKET}`
- [ ] `preflight-check.sh` validates all required env vars before startup
- [ ] Gmail replaced with `security@bmi.edu` in SECURITY.md
- [ ] All Docker images pinned to explicit version tags
- [ ] `cors`, `helmet`, `express-rate-limit` not present in frontend `package.json`
- [ ] JWT refresh token rotation implemented

### CI/CD — 10/10
- [ ] `.github/workflows/ci.yml` runs lint + type-check + test + build on every PR
- [ ] `.github/workflows/security.yml` runs weekly npm audit + CodeQL
- [ ] `.github/dependabot.yml` configured for npm (root + backend), Docker, Actions
- [ ] `.github/pull_request_template.md` created
- [ ] `.github/CODEOWNERS` created
- [ ] All CI jobs pass on a test push to `develop`

### Hygiene — 10/10
- [ ] Root has ≤ 8 shell/script/utility files
- [ ] Internal dev docs moved to `docs/internal/`
- [ ] `scripts/legacy/` contains all debug scripts
- [ ] `scripts/README.md` updated
- [ ] `docker-compose.override.yml` exists for dev, is `.gitignore`d
- [ ] `backend/.dockerignore` exists
- [ ] `npm run lint` exits 0 (ESLint config exists and scripts are wired)
- [ ] Both `@vitejs/plugin-react-swc` (unused) removed

### Docs — 10/10
- [ ] `docs/ARCHITECTURE.md` with Mermaid diagram
- [ ] `docs/api/openapi.yml` covers all endpoints
- [ ] `docs/POSTGRES_MIGRATION.md` exists
- [ ] `docs/PRODUCTION_DEPLOY.md` documents Caddyfile swap for HTTPS
- [ ] CONTRIBUTING.md references commands that actually exist
- [ ] SECURITY.md uses institutional contact address
- [ ] QUICK_START.md warns about `LITESTREAM_S3_BUCKET` placeholder

### Docker — 10/10
- [ ] `./backend:/app` source mount removed from production `docker-compose.yml`
- [ ] Backend Dockerfile is multi-stage, runs as non-root user
- [ ] `docker exec bmi-api whoami` returns non-root username
- [ ] All images use pinned version tags (no `:latest`)
- [ ] Resource limits set on all services
- [ ] `restart: unless-stopped` present on all services including caddy
- [ ] `docker-compose.override.yml` handles dev source mounts
- [ ] Health checks pass on all five services

---

## 5. Agent output format

For each task, output:
```
TASK [PHASE.NUMBER] — [title]
Status: DONE | BLOCKED | SKIPPED
Files changed:
  - [path]: [description]
Verification: [command] → exit 0
Next: [PHASE.NEXT_NUMBER]
```

If blocked:
```
BLOCKER [PHASE.NUMBER]: [precise description]
Options: [A] | [B]
Awaiting decision.
```

After each phase:
```
PHASE [N] COMPLETE
Score change: [dimension] [old]/10 → [new]/10
Commit: [hash or "pending"]
```

---

*Built from direct file reads of: package.json · docker-compose.yml · vite.config.ts · tsconfig.json · Caddyfile · litestream.yml · SECURITY.md · Makefile · CONTRIBUTING.md · .env.example*
*Repo: https://github.com/KIAI-JOSEPH/BMI-PORTAL*
