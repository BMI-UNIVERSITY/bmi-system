# BMI University — Applicant & Student Portal

## Related Repositories
- **[bmi-university](https://github.com/BMI-UNIVERSITY/bmi-university)** — Public marketing and content site (Next.js). The university site's `/apply` page redirects users to this portal for registration.
- **[@bmi/shared](../packages/bmi-shared/)** — Shared program catalog, domain constants, and API types.

An independent, fully serverless admissions and student portal built on **Cloudflare's Free Tier** (Pages + Workers + D1 + R2 + KV).

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (SPA) |
| Backend | Cloudflare Workers (TypeScript) |
| Database | Cloudflare D1 (SQLite) |
| File Storage | Cloudflare R2 |
| Auth | JWT + Cloudflare KV |
| Email | Resend.com (free tier) |
| Deployment | Cloudflare Pages + Workers |

## ⚡ Free Tier Resource Limits

| Resource | Limit | Projected Usage |
|---|---|---|
| Workers Requests | 100,000 / day | ~500 / day |
| D1 Row Reads | 5M / day | ~50,000 / day |
| R2 Storage | 10 GB | ~5 GB |
| Pages Builds | 500 / month | ~20 / month |

## 🚀 Getting Started

### Prerequisites
- Cloudflare account (free)
- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)

### 1. Clone & Install
```bash
git clone https://github.com/BMI-UNIVERSITY/bmi-portal.git
cd bmi-portal
npm install
```

### 2. Configure Environment
```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your actual values
```

### 3. Create Cloudflare Resources
```bash
# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create bmi-portal-db
# → Copy the database_id into wrangler.jsonc

# Create KV namespace
npx wrangler kv namespace create SESSIONS
# → Copy the id into wrangler.jsonc

# Create R2 bucket
npx wrangler r2 bucket create bmi-portal-documents
```

### 4. Run Database Migrations
```bash
# Local
npx wrangler d1 execute bmi-portal-db --local --file=worker/db/schema.sql

# Production
npx wrangler d1 execute bmi-portal-db --file=worker/db/schema.sql
```

### 5. Start Local Dev Server
```bash
npm run dev
```
Visit [http://localhost:5173](http://localhost:5173)

### 6. Deploy to Production
```bash
npm run deploy
```

## 📁 Project Structure
```
bmi-portal/
├── src/                # React frontend
│   ├── pages/          # Route pages
│   ├── components/     # Shared components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # API client
├── worker/             # Cloudflare Worker (backend)
│   ├── routes/         # API route handlers
│   ├── middleware/     # Auth middleware
│   ├── lib/            # JWT, Email utilities
│   └── db/             # Database schema & migrations
├── wrangler.jsonc      # Cloudflare deployment config
└── vite.config.ts      # Frontend build config
```

## 🔒 RBAC Roles
| Role | Access |
|---|---|
| `applicant` | Submit & track own application |
| `student` | (Phase 2) Access courses, grades |
| `staff` | View all applications, update status |
| `admin` | Full access, delete documents |

## 📧 Email Setup (Resend.com)
1. Sign up at [resend.com](https://resend.com)
2. Verify your `bmiuniversity.org` domain
3. Copy your API key to `.dev.vars` and Cloudflare Worker secrets

## 🌐 Domain Integration (Later Phase)
To connect this portal to `bmiuniversity.org`:
1. Add a custom domain in Cloudflare Pages dashboard
2. Set up `portal.bmiuniversity.org` or `apply.bmiuniversity.org`
3. No code changes required — all routes are environment-configured
