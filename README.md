# BMI University System — Monorepo

A unified, 100% serverless platform for BMI University, built on the **Cloudflare free tier**.

## Architecture

```
D:\BMI\
├── apps/
│   ├── api/        → Cloudflare Worker  (Single API for all apps)
│   ├── portal/     → React + CF Pages   (Public Admissions Portal)
│   └── ums/        → React + CF Pages   (Internal UMS for Staff & Students)
├── packages/
│   └── shared/     → @bmi/shared        (Types, constants, CORS origins)
├── bmi-university/ → Next.js + CF Pages (Marketing Website)
└── .github/
    └── workflows/  → CI/CD Auto-deploy
```

## Single Source of Truth

| Concern | Solution |
|---|---|
| **Database** | Cloudflare D1 (`bmi-portal-db`) — one SQL database |
| **Auth (JWT)** | Cloudflare Worker (`apps/api`) — one login for all apps |
| **Object Storage** | Cloudflare R2 (`bmi-portal-documents`) |
| **Session Store** | Cloudflare KV (`SESSIONS`) |
| **CORS Origins** | `packages/shared/src/domains.ts` |

## Apps

### `apps/api` — Unified Cloudflare Worker
The single backend serving **both** the Portal and UMS. Handles:
- Auth (`/api/auth/*`) — shared JWT tokens
- Applications & Admissions (`/api/applications/*`)
- UMS — Students, Grades, Courses, Staff, Enrollments (`/api/v1/*`)
- CMS, Webhooks, Admin tools

### `apps/portal` — Admissions Portal
For **applicants** and incoming students. Handles applications, document uploads, and status tracking.

### `apps/ums` — University Management System
For **staff, faculty, registrars, and students**. Manages academic records, grades, courses, and certificates.

### `bmi-university` — Marketing Website
The public-facing Next.js website.

---

## Local Development

```bash
# Install all workspace dependencies
npm install

# Start the API worker locally (D1 local SQLite)
cd apps/api && npm run dev

# Run the portal (in a separate terminal)
cd apps/portal && npm run dev

# Run the UMS (in a separate terminal, proxy points to api on :8787)
cd apps/ums && npm run dev
```

## Deployment (Cloudflare)

### 1. First-time setup — set secrets
```bash
cd apps/api

npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ADMIN_SETUP_KEY
```

### 2. Run database migrations
```bash
# Apply the unified schema to your live D1 database
npm run db:migrate
```

### 3. Deploy API Worker
```bash
npm run deploy
```

### 4. Deploy frontends
Cloudflare Pages is connected to this GitHub repo (`BMI-UNIVERSITY/bmi-system`).
Any push to `main` triggers auto-deployment via GitHub Actions.

**Manual deploy:**
```bash
cd apps/portal && npm run deploy
cd apps/ums && npx wrangler pages deploy dist --project-name=bmi-ums
```

---

## GitHub Actions Secrets Required

Set these in your GitHub repo → **Settings → Secrets → Actions**:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token (with Workers & Pages permissions) |
| `CLOUDFLARE_ACCOUNT_ID` | `2557f2f143734abc82bd4c80be750eb6` |
| `UMS_API_URL` | `https://bmi-api.bmiuniversity.workers.dev` (your worker URL) |

---

## Adding a New Origin (No Code Change Required)
Set the `ALLOWED_ORIGINS_OVERRIDE` environment variable on the Worker via the Cloudflare Dashboard:
```
https://your-new-domain.com,https://another-domain.com
```
