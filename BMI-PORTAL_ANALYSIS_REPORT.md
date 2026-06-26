# BMI Portal & UMS — Comprehensive Technical & Operational Analysis

**Date:** 26 June 2026
**Repository Analyzed:** [https://github.com/KIAI-JOSE/BMI-PORTAL](https://github.com/KIAI-JOSE/BMI-PORTAL)  
**Companion Repository:** `D:\BMI\bmi-portal` (BMI Admissions Portal)

---

## Executive Summary

This report analyzes the **BMI University Management System (UMS)** hosted at `KIAI-JOSE/BMI-PORTAL` and its companion **BMI Admissions Portal** at `D:\BMI\bmi-portal`. The two applications currently operate as independent systems with separate:

- **Codebases** (different repos, different deployment targets)
- **Databases** (PocketBase/SQLite vs. Cloudflare D1/SQLite)
- **Authentication** (PocketBase-built-in JWT vs. custom JWT)
- **Hosting platforms** (OCI VPS + Docker vs. Cloudflare Workers edge)

The primary objective is a unified architecture: shared identity, synchronized data, consolidated repository management, and cost-effective deployment within free-tier constraints. Below is the complete analysis, with each section addressing a specific requirement.

---

## Table of Contents

1. [Backend Database Assessment & PocketBase Alternative Evaluation](#1-backend-database-assessment--pocketbase-alternative-evaluation)
2. [Multi-App, Multi-Database Architecture Design](#2-multi-app-multi-database-architecture-design)
3. [GitHub Workspace Unification & Sync Strategy](#3-github-workspace-unification--sync-strategy)
4. [Unified Authentication System Implementation](#4-unified-authentication-system-implementation)
5. [Cost Projections & Implementation Timeline](#5-cost-projections--implementation-timeline)
6. [Final Recommendations](#6-final-recommendations)

---

## 1. Backend Database Assessment & PocketBase Alternative Evaluation

### 1.1 Current Database Implementation Audit

#### BMI UMS (KIAI-JOSE/BMI-PORTAL)

| Property | Value |
|---|---|
| **Database Engine** | SQLite 3 (embedded in PocketBase) |
| **Access Layer** | PocketBase REST API + Go SDK calls from Hono.js |
| **Collections** | 24 user-defined, plus PocketBase internal (`_users`, `_tokens`, etc.) |
| **Data Volume** | Modest (university-scale — hundreds to low thousands of students) |
| **Backup** | Litestream → S3-compatible storage (continuous replication) |
| **Sync** | None (single-instance) |
| **Hosting** | Docker container (ghcr.io/muchobien/pocketbase:latest) on OCI VM |
| **Auth** | PocketBase built-in auth (email/password + OAuth2) |

**Strengths of current setup:**
- Zero configuration schema (collections created at runtime by `setupCollections()`)
- Built-in auth with admin UI (`/_/`)
- File storage included (avatars, attachments)
- Real-time subscriptions via Server-Sent Events
- Single binary, extremely easy to deploy

**Weaknesses:**
- **SQLite** is single-writer — no concurrent write scaling
- **No SQL-level access** from application code — all queries go through PocketBase's REST API or its Go SDK sugar, limiting complex JOIN-based reporting
- **PocketBase v0.22** is a moving target; breaking changes between minor versions are common (the repo includes `FIX_POCKETBASE_VERSION.md`)
- **No row-level security** — access control is at the collection level, not row level; multi-tenant data isolation requires application-layer filtering
- **Not an OIDC provider** — cannot serve as a standalone identity provider for other applications
- **No built-in migrations** — schema is created imperatively in code, making rollbacks and version-controlled schema changes difficult

#### BMI Portal (D:\BMI\bmi-portal)

| Property | Value |
|---|---|
| **Database Engine** | SQLite (via Cloudflare D1) |
| **Access Layer** | Direct SQL via `env.DB.prepare()` (parameterized queries) |
| **Tables** | ~20 (users, applications, documents, courses, enrollments, invoices, etc.) |
| **Data Volume** | Modest (admissions-scale) |
| **Backup** | Daily cron → AES-256-GCM encrypted → R2 bucket |
| **Sync** | Webhook-based sync events (via `sync_event_log` table) |
| **Hosting** | Cloudflare Workers edge (serverless) |
| **Auth** | Custom JWT (HS256) + PBKDF2 + TOTP MFA + OAuth (Google/GitHub/Microsoft) |

### 1.2 PocketBase Alternative Evaluation

Six alternatives were evaluated against the project's requirements:

| Criterion | Weight | Supabase | Neon | TiDB Serverless | MongoDB Atlas | Railway.app | Fly.io Postgres |
|---|---|---|---|---|---|---|---|
| Free tier storage | ⭐⭐⭐ | 500 MB + 1 GB files | 0.5 GB | 25 GiB | 512 MB | 0.5 GB | 3 GB (trial) |
| Free tier compute | ⭐⭐⭐ | Shared 500 MB RAM | 100 CU-hrs/mo | 250M RUs/mo | Shared vCPU | 1 vCPU/0.5 GB | 256 MB VM |
| SQL JOINs | ⭐⭐⭐ | ✅ Full Postgres | ✅ Full Postgres | ✅ MySQL-compat | ❌ NoSQL | ✅ Postgres | ✅ Postgres |
| Row-level security | ⭐⭐⭐ | ✅ Built-in RLS | ✅ Postgres RLS | ❌ App-level | ❌ App-level | ✅ Postgres RLS | ✅ Postgres RLS |
| Built-in auth | ⭐⭐⭐ | ✅ Full (50k MAU free) | ✅ Neon Auth | ❌ | ✅ Firebase Auth | ❌ | ❌ |
| File storage | ⭐⭐ | ✅ 1 GB free | ❌ | ❌ | ❌ | ❌ | ❌ |
| Real-time subs | ⭐⭐ | ✅ WebSocket | ⚠️ pg_notify | ❌ | ✅ Change Streams | ❌ | ❌ |
| REST/GraphQL API | ⭐⭐ | ✅ Both auto | ✅ Data API | ✅ Data API | ✅ Data API | ❌ | ❌ |
| Post-MVP cost scaling | ⭐⭐⭐ | $25/mo Pro | ~$0.106/CU-hr | $0.10/1M RU overage | $9/mo M2 | $5/mo Hobby | $38/mo Basic |
| Ease of PB migration | ⭐⭐ | Moderate | Moderate | Easy | Hard | Moderate | Moderate |

**Key findings:**

- **MongoDB Atlas** is eliminated: the document model (NoSQL) is fundamentally incompatible with the relational nature of university data (students ↔ courses ↔ enrollments ↔ grades). Every query pattern in the UMS relies on JOINs, which MongoDB does not support natively (`$lookup` is a slow workaround, not a replacement).

- **PlanetScale** is eliminated: the free tier was discontinued. Minimum $5/month with no free option.

- **Railway.app** and **Fly.io Postgres** are eliminated: their free tiers are too restrictive (Railway: $1/month credit; Fly.io: 256 MB shared VM, 25-connection limit) for a multi-user university system.

- **Neon** is a strong candidate but lacks built-in file storage, auth, and real-time subscriptions, requiring 3+ additional services to replace PocketBase's all-in-one functionality.

- **TiDB Serverless** offers the most storage free (25 GiB) and the easiest SQLite→MySQL migration path, but lacks auth, file storage, and real-time capabilities, and requires careful RU budget management.

- **Supabase** is the only candidate that can replace PocketBase's *entire feature set* in a single platform: database (PostgreSQL), auth (50k MAU free, MTA/TOTP included), file storage (1 GB free), and real-time subscriptions — all within the free tier.

### 1.3 Ranked Recommendations

#### 🥇 #1: Supabase

**Why it wins:** Supabase is the only alternative that directly replaces PocketBase's all-in-one value proposition. It provides PostgreSQL (with full SQL JOINs, 500 MB free), built-in auth (50k MAU, TOTP MFA, OAuth, social login), file storage (1 GB, S3-compatible), and real-time subscriptions — all on the free tier.

**How it outperforms PocketBase for this project:**

| Capability | PocketBase | Supabase (Free) |
|---|---|---|
| SQL JOINs | ❌ (API-only) | ✅ Full PostgreSQL |
| Row-level security | ❌ | ✅ Built-in RLS |
| OIDC provider | ❌ | ✅ (JWKS endpoint) |
| Schema migrations | ❌ (imperative) | ✅ SQL migrations |
| MFA | ❌ Partial (2-method) | ✅ TOTP free |
| GraphQL | ❌ | ✅ pg_graphql |
| Real-time | ✅ SSE | ✅ WebSocket |
| Concurrent writes | ❌ SQLite single-writer | ✅ Postgres MVCC |

**Total estimated monthly cost for production:** $0 (free tier) → $25/mo (Pro, needed for 100k+ MAU or 500 MB+ storage).

#### 🥈 #2: Neon (Serverless PostgreSQL)

**Why it's runner-up:** Excellent developer experience, scale-to-zero (no cost when idle), branching for development workflows. Best if the project already uses PostgreSQL and doesn't need built-in file storage or real-time subscriptions.

**Trade-offs vs. Supabase:**
- No built-in file storage → requires separate S3/adapter
- No real-time subscriptions → requires Socket.io or similar
- Auth is newer (Neon Auth is still maturing)
- Branch-based pricing can be confusing for non-technical budget tracking

**Total estimated monthly cost for production:** ~$0–$5 (scale-to-zero) + $0–$25 (separate auth provider) + $0–$5 (S3-compatible file storage) = $0–$35/month.

#### 🥉 #3: TiDB Serverless

**Why it's worth mentioning:** MySQL wire-protocol compatible, 25 GiB free storage (huge), the easiest SQLite→MySQL migration path. Best if the primary constraint is storage volume and the team is comfortable with MySQL.

**Trade-offs vs. Supabase:**
- No auth, no file storage, no real-time
- RU-based pricing requires careful monitoring (250M RUs/month free; university reporting queries can consume RUs quickly)
- Less ecosystem tooling than PostgreSQL

**Total estimated monthly cost for production:** $0–$10 (RU overage) + $0–$25 (separate auth) + $0–$5 (separate storage) = $0–$40/month.

---

## 2. Multi-App, Multi-Database Architecture Design

### 2.1 Current Architecture

```
┌──────────────────────┐     ┌──────────────────────┐
│    BMI UMS           │     │   BMI Admissions     │
│  (KIAI-JOSE/         │     │   Portal             │
│   BMI-PORTAL)        │     │   (D:\BMI\           │
│                      │     │    bmi-portal)       │
├──────────────────────┤     ├──────────────────────┤
│ React + Vite SPA     │     │ React + Vite SPA     │
│ Hono.js API          │     │ Cloudflare Workers   │
│ PocketBase + SQLite  │     │ D1 + R2 + KV         │
│ Docker on OCI        │     │ Cloudflare Edge      │
│                      │     │                      │
│ Students, Courses,   │     │ Applications, Docs,  │
│ Grades, Certificates,│     │ Enrollments,         │
│ Finance, Library,    │     │ Finances, Support    │
│ Hostels, Medical...  │     │ CMS, Webhooks        │
└──────────────────────┘     └──────────────────────┘
```

### 2.2 Target Unified Architecture

The recommended architecture keeps two logical databases (domain separation) but uses a **shared PostgreSQL instance** with schema-level isolation, running on a **single OCI compute instance** with Supabase as the database and auth layer.

```
┌────────────────────────────────────────────────────┐
│                 OCI Free Tier VM                    │
│              (Ampere A1, 2 OCPU, 12 GB)            │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │           Caddy Reverse Proxy              │     │
│  │    Automatic HTTPS (Let's Encrypt)         │     │
│  │    Security Headers, Rate Limiting         │     │
│  └──────────┬──────────────────────┬──────────┘     │
│             │                      │                │
│  ┌──────────▼──────────┐  ┌───────▼──────────┐     │
│  │   BMI UMS API       │  │ BMI Portal API    │     │
│  │   (Hono.js)         │  │ (Hono.js on Node) │     │
│  │   Port 3001         │  │ Port 3002          │     │
│  └──────────┬──────────┘  └───────┬──────────┘     │
│             │                      │                │
│  ┌──────────▼──────────────────────▼──────────┐     │
│  │          Supabase Service                  │     │
│  │   (PostgreSQL + Auth + Storage + Realtime) │     │
│  │                                            │     │
│  │   ┌────────────────┐ ┌────────────────┐    │     │
│  │   │ ums_schema     │ │ portal_schema  │    │     │
│  │   │ (isolated)     │ │ (isolated)     │    │     │
│  │   │ students       │ │ applications   │    │     │
│  │   │ courses        │ │ documents      │    │     │
│  │   │ grades         │ │ enrollments    │    │     │
│  │   │ certificates   │ │ invoices       │    │     │
│  │   │ finance        │ │ cms_pages      │    │     │
│  │   │ library        │ │ support_tickets│    │     │
│  │   │ hostels, etc.  │ │ sync_log, etc. │    │     │
│  │   └────────────────┘ └────────────────┘    │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │   Redis          │  │   Litestream     │         │
│  │   (Cache/Queue)  │  │  (S3 backup)     │         │
│  └──────────────────┘  └──────────────────┘         │
└────────────────────────────────────────────────────┘
```

### 2.3 Is Schema Consolidation Feasible?

**Yes — with schema-level isolation in PostgreSQL.**

PostgreSQL supports **schema-based multi-tenancy** natively. Both applications can share a single PostgreSQL database with separate schemas:

```
bmi_database/
├── ums_schema/         -- BMI UMS tables
│   ├── students
│   ├── courses
│   ├── grades
│   ├── certificates
│   ├── transactions
│   ├── library_items
│   ├── hostels
│   ├── medical_visits
│   ├── inventory_items
│   ├── visitors
│   ├── attendance_records
│   ├── grade_appeals
│   ├── grading_scales
│   ├── audit_logs
│   └── (12 more)
│
└── portal_schema/      -- BMI Admissions Portal tables
    ├── applications
    ├── documents
    ├── recommendation_requests
    ├── application_status_logs
    ├── enrollments
    ├── invoices
    ├── student_settings
    ├── support_tickets
    ├── sync_event_log
    ├── cms_pages
    ├── cms_posts
    ├── cms_media
    ├── admin_audit_logs
    └── app_config
```

**Benefits of consolidation:**
- **Shared auth** — a single `auth.users` table (Supabase-managed) for both apps
- **Cross-schema queries** — e.g., the Portal can reference UMS course data for enrollment validation
- **Single backup/restore** — one database to manage
- **Reduced resource usage** — one PostgreSQL instance vs. two databases
- **Transaction integrity** across domains (e.g., enrollment in Portal + grade record in UMS)

**Performance implications:**
- PostgreSQL handles hundreds of schemas with no measurable overhead
- Connection pooling via PgBouncer (or Supabase pooler) handles concurrent connections efficiently
- The combined dataset (<5 GB total) is trivial for PostgreSQL's buffer cache

**Security controls:**
- Supabase RLS policies per table (e.g., `ums_schema.students` is readable by `ums_api_role`, `portal_schema.invoices` by `portal_api_role`)
- Separate API roles (`ums_api`, `portal_api`) with `USAGE` on their respective schemas only
- Row-level filtering ensures students see only their own records
- A shared `admin` role with cross-schema read access for reporting

### 2.4 Cross-Database Data Synchronization

For shared entities between the two domains (e.g., a student admitted via Portal needs a record in UMS), use **event-driven synchronization**:

```
Portal (source of truth for admissions)          UMS (source of truth for academics)
       │                                                │
       │  1. Applicant accepted                          │
       │  2. Portal creates enrollment                    │
       │  3. Portal writes to sync_event_log              │
       │     { event: 'student_admitted',                  │
       │       payload: { student_id, program, ... } }     │
       │                                                │
       │  4. UMS polls (or webhook receives) sync_event │
       │  5. UMS creates student record                   │
       │  6. UMS writes ack back to sync_event_log        │
       │                                                │
```

**Conflict resolution principles:**
- **Portal is source of truth** for: applications, documents, enrollments, invoices
- **UMS is source of truth** for: courses, grades, certificates, library, hostels
- **No bidirectional writes** on the same field — each domain owns its data
- **Idempotency keys** — every sync event includes a unique `idempotency_key` (UUID v4) so the consumer can safely retry without duplicates

**Idempotent transaction handling:**
```sql
-- Consumer side (idempotent insert)
INSERT INTO students (id, student_number, first_name, last_name, email, program_code)
SELECT $1, $2, $3, $4, $5, $6
WHERE NOT EXISTS (SELECT 1 FROM students WHERE id = $1);
```

### 2.5 OCI Free Tier Deployment

**Resource budget:**

| Service | RAM Estimate | CPU Estimate | Storage Estimate |
|---|---|---|---|
| Caddy (reverse proxy) | 50 MB | <0.1 OCPU | 50 MB |
| BMI UMS API (Hono.js) | 200 MB | 0.2 OCPU | 200 MB |
| BMI Portal API (Hono.js) | 200 MB | 0.2 OCPU | 200 MB |
| Supabase/PostgreSQL | 1 GB | 0.5 OCPU | 5 GB |
| Redis | 100 MB | 0.1 OCPU | 100 MB |
| Litestream | 50 MB | <0.1 OCPU | 50 MB |
| Ollama (OPTIONAL) | 4–8 GB | 0.5–1.0 OCPU | 5 GB |
| **Total without Ollama** | **~1.6 GB** | **~1.1 OCPU** | **~5.6 GB** |
| **Total with Ollama** | **~5.6–9.6 GB** | **~1.6–2.1 OCPU** | **~10.6 GB** |

**OCI Ampere A1 Free Tier limits:** 2 OCPU / 12 GB RAM / 200 GB block storage

**Verdict:** The entire stack (excluding Ollama) fits comfortably within OCI Free Tier with room to spare. Ollama is feasible only with smaller models (Llama 3.2 3B or Phi-3) and may need to be scaled to a separate instance or removed from the free tier stack.

**OCI configuration checklist:**
1. Create Ampere A1 VM (2 OCPU / 12 GB) running Ubuntu 24.04 ARM64
2. Install Docker + Docker Compose
3. Configure OCI VCN with ports 80, 443 open, all others closed
4. Bind a reserved public IPv4 address (free tier includes 1 public IP)
5. Set up Let's Encrypt via Caddy (automatic)
6. Set up OCI budget alerts at 0.01 USD (notify if any charge is incurred)
7. Configure Litestream to replicate to OCI Object Storage (free tier: 10 GB)

**OCI free tier limitations to watch:**
- Boot volume (50 GB) counts toward the 200 GB total — plan accordingly
- Outbound bandwidth capped at 10 TB/month (generous but monitorable)
- Idle resource reclamation: CPU <20%, network <20%, memory <20% for sustained periods may trigger reclamation
- "Out of host capacity" errors are common for free tier — retry in a different availability domain

---

## 3. GitHub Workspace Unification & Sync Strategy

### 3.1 Current State

| Property | BMI UMS | BMI Admissions Portal |
|---|---|---|
| GitHub Owner | `KIAI-JOSE` (personal) | Local only (`D:\BMI\`) |
| Repository | `KIAI-JOSE/BMI-PORTAL` | `bmi-portal` (pushed to `BMI-UNIVERSITY/bmi-portal`) |
| Visibility | Public | Private |
| CI/CD | GitHub Actions (ci.yml) | Wrangler CLI |
| Shared code | None | `@bmi/shared` workspace package |

### 3.2 Recommended Monorepo Structure

Given both applications are:
- Built with the same frontend framework (React + Vite + TypeScript)
- Expected to share authentication, database schemas, and eventually components
- Developed by the same small team

**A monorepo with NPM workspaces is the recommended approach.**

```
bmi-university/
├── .github/
│   └── workflows/
│       ├── ci-ums.yml           # UMS build + test
│       ├── ci-portal.yml        # Portal build + test
│       ├── security-audit.yml   # Shared dependency audit
│       └── deploy.yml           # Unified deployment
├── packages/
│   ├── bmi-shared/              # Existing shared package
│   │   ├── src/
│   │   │   ├── types/           # Shared TypeScript types
│   │   │   ├── config/          # CORS origins, constants
│   │   │   └── utils/           # Shared utilities
│   │   └── package.json
│   ├── bmi-auth/                # NEW: Shared auth library
│   │   ├── src/
│   │   │   ├── supabase.ts      # Supabase client wrapper
│   │   │   ├── rbac.ts          # Role/permission helpers
│   │   │   └── hooks/           # React auth hooks
│   │   └── package.json
│   └── bmi-database/            # NEW: Shared DB migrations
│       ├── migrations/          # Supabase SQL migrations
│       ├── seeds/               # Seed data scripts
│       └── package.json
├── apps/
│   ├── ums/                     # BMI UMS (from KIAI-JOSE/BMI-PORTAL)
│   │   ├── backend/
│   │   │   ├── src/
│   │   │   └── package.json
│   │   ├── src/                 # Frontend
│   │   ├── docker/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── portal/                  # BMI Admissions Portal
│       ├── worker/              # (Convert from CF Workers to Node/Hono)
│       ├── src/                 # Frontend
│       └── package.json
├── docker-compose.yml           # Unified deployment config
├── Makefile                     # Dev commands
├── package.json                 # Root workspace config
├── tsconfig.base.json           # Shared TS config
└── README.md                    # Unified README
```

### 3.3 Repository Restructuring Steps

1. **Create the monorepo** under `BMI-UNIVERSITY/bmi-university` (or `KIAI-JOSE/bmi-university`)
2. **Migrate UMS** into `apps/ums/`:
   - Move `backend/` → `apps/ums/backend/`
   - Move `src/` (frontend) → `apps/ums/src/`
   - Move config files (docker-compose, Caddyfile, etc.) to `apps/ums/`
3. **Migrate Portal** into `apps/portal/`:
   - Move `worker/` → `apps/portal/worker/`
   - Move `src/` (frontend) → `apps/portal/src/`
   - Move config files (wrangler.jsonc) to `apps/portal/`
4. **Create shared packages:**
   - `packages/bmi-shared/` — from existing `packages/bmi-shared/`
   - `packages/bmi-auth/` — new Supabase auth client
   - `packages/bmi-database/` — shared migrations and seeds
5. **Configure root `package.json`** with NPM workspaces
6. **Update CI/CD workflows** to run per-app on changed paths

### 3.4 CI/CD Pipeline Adjustments

```yaml
# .github/workflows/ci-ums.yml
name: UMS CI
on:
  push:
    paths: ['apps/ums/**', 'packages/**']
    branches: [main, develop]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx nx test ums        # Nx for monorepo task orchestration
      - run: npx nx build ums

# .github/workflows/ci-portal.yml
name: Portal CI
on:
  push:
    paths: ['apps/portal/**', 'packages/**']
    branches: [main, develop]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx nx test portal
      - run: npx nx build portal
```

### 3.5 Monorepo vs. Polyrepo Verdict

**Monorepo (Selected)** is the correct choice because:

| Factor | Monorepo | Polyrepo | Why Monorepo Wins |
|---|---|---|---|
| Shared code | ✅ Single source | ❌ Duplicate/publish | `@bmi/shared` already exists |
| Atomic commits | ✅ Cross-app changes in one commit | ❌ Multiple PRs | Portal + UMS changes often coupled |
| CI efficiency | ✅ Changed-path filtering | ❌ Run all CI all the time | Faster feedback |
| Dependency management | ✅ Single `node_modules` | ❌ Duplicate deps | npm audit once |
| Team overhead | ✅ One repo to clone | ❌ Multiple clones | Small team benefit |
| Deployment coupling | ⚠️ Needs tooling | ✅ Independent deploys | Mitigated with Nx/NPM workspaces |

**Tooling:** Use **Nx** (recommended) or **Turborepo** for monorepo task orchestration. Both support:
- Affected-project detection (only build/test what changed)
- Dependency graph visualization
- Cached task execution
- Distributed task execution (for larger teams later)

---

## 4. Unified Authentication System Implementation

### 4.1 Current Auth Architectures

**BMI UMS** (PocketBase):
- PocketBase HTTP API (`POST /api/collections/users/auth-with-password`)
- PocketBase JWT tokens (HS256 by default, configurable)
- Role stored in PocketBase `users` collection
- No MFA, no OIDC support
- Session managed via PocketBase token cookies

**BMI Portal** (Custom):
- Custom JWT (HS256) with PBKDF2 password hashing
- TOTP MFA (Google Authenticator compatible)
- OAuth 2.0 (Google, GitHub, Microsoft)
- CSRF double-submit cookie pattern
- Session in Cloudflare KV
- Roles: applicant, student, staff, admin

### 4.2 Recommended Solution: Supabase Auth + Self-Hosted Keycloak

**Primary recommendation: Supabase Auth** (if adopting Supabase as the database layer).  
**Fallback for OCI-only deployment: Keycloak** (self-hosted, Docker container).

#### Supabase Auth (Recommended Path)

Supabase Auth is the natural choice if the database migration (Section 1) uses Supabase. It provides:

| Feature | Free Tier | Paid Tier |
|---|---|---|
| Monthly Active Users | 50,000 | 100,000+ ($25/mo Pro) |
| Social Login Providers | Unlimited | Unlimited |
| MFA (TOTP) | ✅ Included | ✅ Included |
| MFA (SMS/Phone) | ❌ | $75/mo add-on |
| RBAC via RLS | ✅ PostgreSQL RLS | ✅ PostgreSQL RLS |
| OIDC Provider | ✅ JWKS endpoint | ✅ JWKS endpoint |
| Custom JWT | ✅ Via Supabase Auth | ✅ Via Supabase Auth |
| User Impersonation | ❌ | ✅ |
| Audit Logs | ✅ Basic | ✅ Full |

**Integration with both apps:**

```
┌──────────────────────────────────────────────┐
│              Supabase Auth                    │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │          auth.users table              │  │
│  │  id, email, encrypted_password,       │  │
│  │  role, mfa_secret, etc.               │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  JWT Payload:                                │
│  { sub, email, role,                         │
│    app_metadata: { ums_role, portal_role }, │
│    user_metadata: { first_name, last_name }}│
│                                              │
└──────────┬───────────────────────┬───────────┘
           │                       │
           ▼                       ▼
   ┌──────────────┐      ┌────────────────┐
   │ BMI UMS API  │      │ BMI Portal API │
   │ Hono.js      │      │ Hono.js        │
   │ Validate JWT │      │ Validate JWT   │
   │ via Supabase │      │ via Supabase   │
   │ JWKS endpoint│      │ JWKS endpoint  │
   └──────────────┘      └────────────────┘
```

**JWT validation flow (both apps):**

```typescript
// Shared auth middleware (packages/bmi-auth/src/middleware.ts)
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

export async function requireAuth(request: Request, allowedRoles?: string[]) {
  const token = extractToken(request);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${SUPABASE_URL}/auth/v1`,
    audience: 'authenticated',
  });
  
  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    throw new ForbiddenError();
  }
  
  return payload;
}
```

#### Keycloak (OCI Self-Hosted Fallback)

If the team prefers to keep everything on OCI without using an external Supabase-managed service, **Keycloak** is the recommended self-hosted alternative:

| Feature | Keycloak Capability |
|---|---|
| OIDC Provider | ✅ Full OIDC conformant |
| OAuth 2.0 | ✅ Authorization Code, Client Credentials, Device Flow |
| SAML 2.0 | ✅ IdP + SP |
| MFA | ✅ TOTP, WebAuthn/Passkeys, Recovery Codes |
| RBAC | ✅ Fine-grained, role-based, attribute-based |
| User Federation | ✅ LDAP, Active Directory |
| Docker | ✅ Official container (quay.io/keycloak/keycloak) |
| Resource usage | ~1 GB RAM, <0.5 OCPU |
| License | Apache 2.0 (completely free) |

**Keycloak Docker setup for OCI:**
```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start --optimized
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KC_DB_PASSWORD}
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_HOSTNAME: auth.bmi-university.edu
      KC_PROXY: edge
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    volumes:
      - keycloak_data:/opt/keycloak/data
```

### 4.3 Migration Plan for Existing User Credentials

#### Phase 1: Parallel Run (1–2 weeks)

1. Deploy the new auth system (Supabase Auth or Keycloak) alongside the existing auth
2. Configure both apps to accept tokens from both old and new auth systems
3. Users can log in via either system transparently
4. No data migration yet — validate that the new system works

```typescript
// Dual-auth middleware during migration
async function dualAuthMiddleware(request: Request) {
  // Try new auth first
  try {
    return await supabaseAuth(request);
  } catch {
    // Fall back to old auth
    return await legacyAuth(request);
  }
}
```

#### Phase 2: Bulk Import (Week 3)

1. **Export users from PocketBase** (BMI UMS):
   ```bash
   # PocketBase admin API: GET /api/collections/users/records
   # Export all users with their bcrypt password hashes, roles, metadata
   ```

2. **Export users from D1** (BMI Portal):
   ```sql
   SELECT id, email, password_hash, first_name, last_name, role, mfa_secret
   FROM users;
   ```

3. **Import into Supabase Auth**:
   ```typescript
   // Supabase Admin API supports bulk user import
   // Note: Password hashes must be migrated with a hash hook
   // Supabase uses Argon2 by default — configure bcrypt compatibility hook
   
   const { data, error } = await supabase.auth.admin.createUser({
     email: user.email,
     password_hash: user.password_hash,
     password_hash_type: 'bcrypt',  // Supabase supports bcrypt migration
     email_confirm: true,
     user_metadata: {
       first_name: user.first_name,
       last_name: user.last_name,
       legacy_role: user.role,
     },
   });
   ```

4. **MFA tokens are NOT portable** — users enrolled in TOTP MFA must re-enroll. The new system should:
   - Prompt users to set up MFA on first login
   - Offer a 7-day grace period where MFA is optional (only for migrated users)

#### Phase 3: Cutover (Week 4)

1. Disable old auth endpoints
2. Remove dual-auth middleware
3. All logins go through new auth system
4. Legacy password hashes are replaced on first successful login (users who haven't logged in retain their migrated hash)

#### Security Safeguards During Migration

- **Export data in transit:** All user data exports must use TLS (HTTPS/SSH tunnels)
- **Export at rest:** Never store plaintext password exports — export only password hashes
- **Rollback plan:** Keep the old PocketBase and D1 databases untouched for 30 days post-cutover
- **Rate limit the import:** 100 users/minute to avoid triggering abuse detection on Supabase
- **Audit log every import action:** `audit_logs` table in UMS records every imported user with its source
- **No password exposure at any point:** Passwords are never read or stored in plaintext — only hashes are migrated

### 4.4 Post-Launch Access Control Framework

```
┌────────────────────────────────────────────────────────────┐
│              Unified Permission Model                       │
│                                                            │
│  Role (JWT claim)  →  App Access  →  Feature Permissions   │
│                                                            │
│  super_admin       →  UMS + Portal  →  Everything          │
│  admin             →  UMS + Portal  →  Manage content,     │
│                                        users, settings     │
│  registrar         →  UMS + Portal  →  Applications,       │
│                                        enrollments,        │
│                                        grades              │
│  faculty           →  UMS only      →  Their courses,      │
│                                        grade entry         │
│  student           →  Both          →  Their own records,  │
│                                        portal, finances    │
│  staff             →  UMS + Portal  →  Support tickets,    │
│                                        visitor mgmt        │
│  applicant         →  Portal only   →  Their application,  │
│                                        documents           │
│  viewer            →  UMS only      →  Read-only reports   │
└────────────────────────────────────────────────────────────┘
```

**Implementation in Supabase:**
- Store `app_metadata.role` in the Supabase `auth.users` record
- Map to PostgreSQL RLS policies: `CREATE POLICY student_read_own ON portal_schema.enrollments FOR SELECT USING (auth.jwt() ->> 'sub' = user_id)`
- Cross-app authorization: the JWT is shared, so both apps decode the same `role` claim

---

## 5. Cost Projections & Implementation Timeline

### 5.1 Cost Projections

#### Option A: Supabase + OCI (Recommended)

| Component | Free Tier | Monthly Cost |
|---|---|---|
| **OCI Compute** (Ampere A1, 2 OCPU, 12 GB) | ✅ Included | $0 |
| **OCI Block Storage** (200 GB) | ✅ Included | $0 |
| **OCI Object Storage** (10 GB) | ✅ Included | $0 |
| **OCI Public IP + Bandwidth** | ✅ Included | $0 |
| **Supabase** (PostgreSQL 500 MB, Auth 50k MAU, Storage 1 GB, Real-time) | ✅ Included | $0 |
| **Redis** (Docker on OCI, 100 MB) | ✅ Included in OCI | $0 |
| **Caddy** (reverse proxy) | ✅ Included in OCI | $0 |
| **Total Monthly** | | **$0.00** |

**Trigger points for paid tiers:**

| Trigger | Upgrade | Cost |
|---|---|---|
| PostgreSQL exceeds 500 MB | Supabase Pro ($25/mo) + add storage ($0.125/GB) | $25+/mo |
| Auth exceeds 50k MAU | Supabase Pro ($25/mo) + $0.00325/extra MAU | $25+/mo |
| Storage exceeds 1 GB | Supabase Pro — $0.0213/GB file storage | $25+/mo |
| Need phone/SMS MFA | Supabase Pro + $75/mo phone add-on | $100/mo |
| OCI outbound exceeds 10 TB/mo | OCI egress overage (~$0.0085/GB) | ~$8.50/TB |
| OCI idle resource reclamation triggers need for larger instance | PAYG upgrade — Ampere overage (~$0.0131/OCPU-hr) | ~$9.50/extra OCPU/mo |

#### Option B: OCI-Only (all self-hosted, no Supabase)

| Component | Free Tier | Monthly Cost |
|---|---|---|
| **OCI Compute** | ✅ Included | $0 |
| **PostgreSQL** (Docker on OCI) | ✅ Included in OCI | $0 |
| **Keycloak** (Docker on OCI) | ✅ Included in OCI | $0 |
| **Redis** (Docker on OCI) | ✅ Included in OCI | $0 |
| **Litestream** (Docker on OCI) | ✅ Included in OCI | $0 |
| **Caddy** (Docker on OCI) | ✅ Included in OCI | $0 |
| **Ollama** (optional, smaller model) | ✅ Contingent on capacity | $0 |
| **Total Monthly** | | **$0.00** |

**Verdict:** Both options operate at **$0/month** within free tier limits. Option A (Supabase) provides a managed database with auth built-in, reducing operational burden. Option B (OCI-only) provides maximum control but requires more manual configuration, backups, and security hardening.

### 5.2 Implementation Timeline

```
Phase 0: Foundation (Weeks 1-2)
├── Set up monorepo structure
├── Migrate both repos into monorepo
├── Set up Nx for task orchestration
├── Configure CI/CD with path-based triggers
└── Set up shared packages (bmi-shared, bmi-auth, bmi-database)

Phase 1: Database Migration (Weeks 3-5)
├── Set up Supabase project (or PostgreSQL on OCI)
├── Create schema migrations for UMS (ums_schema)
├── Create schema migrations for Portal (portal_schema)
├── Migrate UMS data from PocketBase to PostgreSQL
├── Migrate Portal data from D1 to PostgreSQL
├── Validate data integrity (row counts, checksums)
└── Set up Litestream replication to OCI Object Storage

Phase 2: Auth Migration (Weeks 5-7)
├── Deploy Supabase Auth (or Keycloak)
├── Configure OAuth providers (Google, GitHub, Microsoft)
├── Enable TOTP MFA
├── Implement shared JWT validation middleware
├── Phase 1: Parallel run (accept tokens from old + new)
├── Bulk import users from PocketBase + D1
├── Phase 2: Cutover to new auth
└── Monitor auth error rates for 1 week post-cutover

Phase 3: App Migration (Weeks 7-10)
├── Port UMS backend from PocketBase SDK to Supabase/PostgreSQL
├── Port Portal backend from Cloudflare Workers to Hono.js on Node
├── Implement cross-schema queries for shared data
├── Implement sync_event_log for domain-crossing events
├── Update frontend auth hooks to use Supabase client (or Keycloak adapter)
├── Deploy to OCI via Docker Compose
├── Validate end-to-end workflows
└── Decommission old PocketBase + D1 databases

Phase 4: Hardening (Weeks 11-12)
├── Security audit of new architecture
├── Performance testing under load
├── Disaster recovery drill (restore from Litestream backup)
├── Documentation update
└── Team training on new architecture
```

**Total timeline: 12 weeks (3 months)**

---

## 6. Final Recommendations

### Database

**Migrate from PocketBase/SQLite to Supabase (PostgreSQL).** This is the single highest-impact change. It resolves all five PocketBase weaknesses simultaneously: JOIN support, row-level security, OIDC capability, proper migrations, and concurrent write scaling. The free tier covers the university's needs for the foreseeable future. The migration is moderate effort (schema conversion, query rewriting) but the long-term maintenance savings are substantial.

### Architecture

**Consolidate both apps onto a single PostgreSQL database with schema-level isolation.** This enables shared auth, cross-schema queries, single backup/restore, and reduced resource usage. Two PostgreSQL schemas (`ums_schema` and `portal_schema`) provide clean separation while allowing controlled cross-domain queries via a shared `admin` role.

### Authentication

**Use Supabase Auth** (if adopting Supabase) or **Keycloak** (if keeping everything self-hosted on OCI). Both provide proper OIDC/OAuth 2.0 with MFA, RBAC, and cross-app single sign-on. The migration plan uses a dual-auth middleware pattern to avoid downtime and includes a 30-day rollback window.

### Repository Management

**Adopt a monorepo** structure with NPM workspaces and Nx task orchestration. Move both applications into `apps/` and shared code into `packages/`. Configure CI/CD with path-based triggers so changes to either app only run their respective test suites.

### Deployment

**Deploy everything on the OCI Free Tier** (Ampere A1, 2 OCPU, 12 GB RAM, 200 GB storage). The entire stack (UMS API, Portal API, PostgreSQL, Redis, Caddy, Litestream, and optionally Keycloak) fits within free tier limits. Ollama (local AI) is optional and may require a smaller model due to RAM constraints.

### Cost

**Total monthly cost: $0** within free tiers. First upgrade trigger is ~50k MAU or 500 MB+ PostgreSQL storage, both of which are unlikely in the first 12–24 months for a single university deployment.

---

*End of Report*
