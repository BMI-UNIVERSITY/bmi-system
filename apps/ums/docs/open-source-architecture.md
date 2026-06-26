# BMI University Management System - 100% Open Source Architecture

## Executive Summary

This document outlines a complete migration path from the current proprietary-dependent stack to a **100% open-source, self-hosted, privacy-focused architecture**. The new stack prioritizes data sovereignty, security, and zero external API dependencies.

---

## Current Stack Issues

| Component | Current | Problem | Risk Level |
|-----------|---------|---------|------------|
| AI/LLM | Google Gemini API | Data sent to Google; proprietary; API key exposure | **CRITICAL** |
| Auth | None (mock login) | No authentication/authorization | **CRITICAL** |
| Database | localStorage | No encryption; XSS vulnerable; ephemeral | **CRITICAL** |
| Storage | Firestore (optional) | Google dependency; vendor lock-in | **HIGH** |
| Hosting | Firebase/Vercel | Proprietary platforms; limited control | **MEDIUM** |

---

## Recommended Open Source Stack

### 1. AI / LLM Layer (Replace Google Gemini)

**Selected: Ollama + Llama 3.2**

| Tool | License | Pros | Cons | Verdict |
|------|---------|------|------|---------|
| **Ollama** | MIT | OpenAI-compatible API; simple CLI; extensive model library; GPU acceleration | Requires local GPU for best performance | **✅ SELECTED** |
| LocalAI | MIT | Full OpenAI drop-in; multimodal; function calling | More complex setup; heavier resource usage | Alternative |
| vLLM | Apache 2.0 | Production-grade; PagedAttention; high throughput | Requires high-end GPUs; no GGUF support | High-scale alternative |
| transformers.js | Apache 2.0 | Browser-based; no server needed | Limited model size; slower inference | Edge cases only |

**Rationale:**
- Ollama provides the best balance of simplicity, compatibility, and performance
- Llama 3.2 (3B/8B parameters) is lightweight enough for modest hardware
- OpenAI-compatible API allows drop-in replacement with minimal code changes
- MIT license is permissive and business-friendly

**Hardware Requirements:**
- Minimum: 8GB RAM, 4-core CPU (CPU-only mode)
- Recommended: 16GB RAM, NVIDIA GPU with 8GB+ VRAM
- Model: Llama 3.2 8B (Q4_K_M quantization for efficiency)

```bash
# Installation (Ubuntu/WSL)
curl -fsSL https://ollama.com/install.sh | sh

# Run model
ollama run llama3.2

# API endpoint (OpenAI-compatible)
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

### 2. Authentication & Authorization (New Component)

**Selected: PocketBase Built-in Auth**

| Tool | License | Pros | Cons | Verdict |
|------|---------|------|------|---------|
| **PocketBase** | MIT | Single binary; built-in auth; SQLite; zero config | Pre-1.0; limited write concurrency | **✅ SELECTED** |
| Supabase Auth | Apache 2.0 | Production-ready; RLS; extensive features | Complex self-hosting; resource-heavy | Alternative |
| Keycloak | Apache 2.0 | Enterprise-grade; battle-tested; full-featured | Complex setup; Java-based; heavy | Enterprise alternative |
| Zitadel | Apache 2.0 | API-first; multi-tenancy; modern | Smaller community; newer | B2B alternative |

**Rationale:**
- PocketBase provides auth, database, and storage in a single 15MB binary
- Built-in email/password, OAuth2, and MFA support
- Row-level security equivalent through collection rules
- Perfect fit for small-to-medium university management system
- Can be extended with Go hooks for custom logic

**Features:**
- Email/password authentication
- OAuth2 (Google, GitHub, etc.)
- JWT token-based sessions
- Password reset flow
- User management dashboard
- Collection-level permissions

---

### 3. Database Layer (Replace localStorage)

**Selected: SQLite via PocketBase**

| Tool | License | Pros | Cons | Verdict |
|------|---------|------|------|---------|
| **SQLite** | Public Domain | Serverless; zero config; ACID; battle-tested | Write concurrency limits | **✅ SELECTED** |
| PostgreSQL | PostgreSQL License | Production-grade; complex queries; scales well | Requires separate server; complex setup | Scale-up alternative |
| Supabase | Apache 2.0 | Managed Postgres; real-time; RLS | Complex self-hosting | Large-scale alternative |

**Rationale:**
- SQLite is sufficient for ~3,600 students and ~150 staff
- ACID compliance ensures data integrity
- WAL mode provides good concurrency for read-heavy workloads
- No separate database server needed
- Can migrate to PostgreSQL later if needed

**Data Model:**
```sql
-- Core tables (managed via PocketBase collections)
collections: {
  students: { id, firstName, lastName, email, faculty, department, status, gpa, authRecordId }
  staff: { id, name, role, department, email, category, specialization }
  courses: { id, name, code, faculty, credits, status, description }
  certificates: { id, serial_number, student_id, degree, issue_date, status, content_hash }
  transactions: { id, ref, name, amount, status, date }
  audit_logs: { id, action, user_id, resource, timestamp, ip_address }
}
```

---

### 4. Backend API Layer (New Component)

**Selected: Hono.js + Zod**

| Tool | License | Pros | Cons | Verdict |
|------|---------|------|------|---------|
| **Hono** | MIT | Ultra-fast; lightweight; Edge-compatible; TypeScript | Smaller ecosystem than Express | **✅ SELECTED** |
| Express.js | MIT | Mature; extensive middleware; huge ecosystem | Slower; callback-based; older | Alternative |
| Fastify | MIT | Fast; plugin architecture; modern | Steeper learning curve | Alternative |
| Elysia | MIT | Bun-native; extremely fast; type-safe | Bun-only; newer; smaller community | Bun alternative |

**Rationale:**
- Hono is 3x faster than Express with minimal overhead
- Native TypeScript support
- Compatible with Node.js, Deno, Bun, and Edge runtimes
- Built-in middleware for CORS, JWT, rate limiting
- Small bundle size (12KB)

**API Structure:**
```typescript
// API Routes
/api/v1/auth        - Authentication (login, logout, refresh)
/api/v1/students    - CRUD operations for students
/api/v1/staff       - CRUD operations for staff
/api/v1/courses     - CRUD operations for courses
/api/v1/certificates - Certificate generation & verification
/api/v1/finance     - Financial records
/api/v1/audit       - Audit logs
/api/v1/ai          - Local LLM proxy
```

---

### 5. File Storage (New Component)

**Selected: MinIO + PocketBase Storage**

| Tool | License | Pros | Cons | Verdict |
|------|---------|------|------|---------|
| **MinIO** | AGPL-3.0 | S3-compatible; high performance; scalable | AGPL license; single-node less useful | **✅ SELECTED** |
| PocketBase | MIT | Built-in; simple; integrated | Local storage only; no S3 API | Primary for small files |
| SeaweedFS | Apache 2.0 | Distributed; scalable; fast | Complex setup; more components | Scale alternative |

**Rationale:**
- MinIO provides S3-compatible API for certificate PDFs, student photos
- PocketBase handles smaller files (avatars, documents)
- Can start with PocketBase only, add MinIO for scale

---

### 6. Frontend (Retained & Enhanced)

**Selected: React + Vite + TailwindCSS (Existing)**

| Tool | License | Status | Action |
|------|---------|--------|--------|
| React | MIT | ✅ Keep | Upgrade to React 19 |
| Vite | MIT | ✅ Keep | Current version |
| TailwindCSS | MIT | ✅ Keep | v4.0 (already upgraded) |
| Recharts | MIT | ✅ Keep | For charts |
| Lucide React | ISC | ✅ Keep | For icons |
| jsQR | MIT | ✅ Keep | QR scanning |
| qrcode | MIT | ✅ Keep | QR generation |
| html2pdf.js | MIT | ✅ Keep | PDF generation |

**Changes:**
- Remove `@google/genai` dependency
- Add `pocketbase` SDK
- Add encryption utilities (crypto-js or Web Crypto API)
- Replace localStorage with API calls

---

### 7. Reverse Proxy & SSL (New Component)

**Selected: Caddy**

| Tool | License | Pros | Cons | Verdict |
|------|---------|------|------|---------|
| **Caddy** | Apache 2.0 | Automatic HTTPS; simple config; HTTP/3; modern | Less mature than nginx | **✅ SELECTED** |
| nginx | BSD-2 | Battle-tested; fast; huge ecosystem | Complex config; manual HTTPS | Alternative |
| Traefik | MIT | Cloud-native; auto-discovery; modern | Complex for simple setups | Container alternative |

**Rationale:**
- Caddy provides automatic HTTPS via Let's Encrypt
- Much simpler configuration than nginx
- HTTP/2 and HTTP/3 support out of the box
- Modern, security-focused design

---

### 8. Self-Hosted PaaS / Deployment (New Component)

**Selected: Coolify**

| Tool | License | Pros | Cons | Verdict |
|------|---------|------|------|---------|
| **Coolify** | Apache 2.0 | Vercel-like experience; databases; monitoring; active development | Resource-heavy; complex | **✅ SELECTED** |
| Dokploy | MIT | Modern; Docker-based; simpler than Coolify | Newer; smaller community | Alternative |
| Dokku | MIT | Heroku-like; Git push deploy; lightweight | CLI-focused; less GUI | Minimal alternative |
| CapRover | Apache 2.0 | Easy to use; one-click apps; well-established | Less modern architecture | Alternative |

**Rationale:**
- Coolify provides the most complete Vercel-like experience
- Built-in database management (PostgreSQL, MySQL, Redis, MongoDB)
- Automated SSL, backups, monitoring
- 15,000+ GitHub stars (strong community)
- Resource-intensive but manageable for small teams

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Browser    │  │   Mobile     │  │   QR Scanner │  │   Public     │     │
│  │   (React)    │  │   (PWA)      │  │   (Verify)   │  │   Verification│    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼──────────────────┼───────────┘
          │                  │                  │                  │
          └──────────────────┴──────────────────┴──────────────────┘
                                  │
                    HTTPS (Caddy/Let's Encrypt)
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                           REVERSE PROXY                                     │
│                           Caddy Server                                      │
│  • Automatic HTTPS • HTTP/3 • Rate Limiting • Security Headers               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────▼──────────┐  ┌─────────▼──────────┐  ┌─────────▼──────────┐
│    FRONTEND        │  │     BACKEND API    │  │   LLM SERVICE      │
│    (Vite/React)    │  │   (Hono.js/Node)   │  │   (Ollama)         │
│  • Static files    │  │  • REST API        │  │  • Llama 3.2       │
│  • Served by Caddy │  │  • JWT Auth        │  │  • Local inference │
└────────────────────┘  │  • RBAC            │  │  • OpenAI API      │
                        │  • Rate limiting   │  └────────────────────┘
                        │  • Input validation│
                        └──────────┬─────────┘
                                   │
                        ┌──────────▼──────────┐
                        │    POCKETBASE       │
                        │  • SQLite Database  │
                        │  • Authentication   │
                        │  • File Storage     │
                        │  • Real-time API    │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │    MINIO (opt)      │
                        │  • S3-compatible    │
                        │  • PDF storage      │
                        │  • Backups          │
                        └─────────────────────┘
```

---

## Technology Stack Summary

| Layer | Technology | License | Purpose |
|-------|------------|---------|---------|
| Frontend | React 19 + Vite + TailwindCSS | MIT | UI layer |
| Backend API | Hono.js + Zod | MIT | REST API server |
| Database | SQLite (via PocketBase) | Public Domain | Data persistence |
| Auth | PocketBase Auth | MIT | User management, JWT |
| Storage | PocketBase + MinIO | MIT/AGPL-3.0 | File storage |
| AI/LLM | Ollama + Llama 3.2 | MIT | Local AI assistant |
| Proxy | Caddy | Apache 2.0 | Reverse proxy, SSL |
| Deployment | Coolify | Apache 2.0 | Self-hosted PaaS |
| OS | Ubuntu Server 22.04 LTS | GPL | Host operating system |

---

## Migration Path

### Phase 1: Foundation (Week 1-2)
1. Set up Ubuntu WSL or cloud VPS
2. Install and configure PocketBase
3. Set up Ollama with Llama 3.2
4. Create database schema in PocketBase

### Phase 2: Backend API (Week 3-4)
1. Create Hono.js API server
2. Implement authentication endpoints
3. Implement CRUD endpoints for all modules
4. Add rate limiting and security middleware

### Phase 3: Frontend Migration (Week 5-6)
1. Replace localStorage with API calls
2. Remove Google Gemini SDK
3. Implement JWT token handling
4. Add role-based UI controls

### Phase 4: Security Hardening (Week 7)
1. Implement data encryption at rest
2. Add audit logging
3. Set up Caddy with automatic HTTPS
4. Implement backup strategy

### Phase 5: Deployment (Week 8)
1. Deploy to Coolify
2. Configure domain and SSL
3. Set up monitoring
4. Performance testing

---

## Security Improvements

| Feature | Before | After |
|---------|--------|-------|
| Authentication | ❌ None | ✅ JWT + bcrypt |
| Password Storage | ❌ Plaintext | ✅ bcrypt (12 rounds) |
| Data Encryption | ❌ None | ✅ AES-256 at rest |
| API Security | ❌ None | ✅ Rate limiting, Helmet, CORS |
| Audit Logging | ❌ None | ✅ All actions logged |
| HTTPS | ❌ Optional | ✅ Enforced + HSTS |
| AI Data Privacy | ❌ Google Gemini | ✅ Local Ollama |

---

## Cost Comparison

| Component | Current (Proprietary) | New (Open Source) |
|-----------|----------------------|-------------------|
| AI/LLM | $0.002-0.06 per 1K tokens | $0 (local) |
| Auth | Firebase Auth ($0.01/verification) | $0 (PocketBase) |
| Database | Firestore ($0.10/100K reads) | $0 (SQLite) |
| Hosting | Vercel Pro ($20/mo) | Coolify on VPS ($5-20/mo) |
| Storage | Firebase Storage ($0.05/GB) | MinIO ($0 local) |
| **Monthly Total** | **$50-200+** | **$5-20** |

---

## Hardware Recommendations

### Minimum (CPU-only)
- 4 CPU cores
- 8GB RAM
- 50GB SSD
- Can run Llama 3.2 3B (slower)

### Recommended (with GPU)
- 4-8 CPU cores
- 16GB+ RAM
- NVIDIA GTX 1660+ or RTX 3060+ (8GB+ VRAM)
- 100GB SSD
- Can run Llama 3.2 8B (fast)

### Production (High-scale)
- 8+ CPU cores
- 32GB+ RAM
- NVIDIA RTX 4090 or A100 (24GB+ VRAM)
- 500GB SSD
- Can run multiple models or larger models

---

## Next Steps

1. ✅ Review and approve architecture
2. Set up development environment (Ubuntu WSL)
3. Begin Phase 1 implementation
4. Create detailed API specification
5. Implement and test incrementally

---

## License Summary

All components use permissive open-source licenses:
- **MIT**: React, Vite, Hono, Ollama, PocketBase, TailwindCSS
- **Apache 2.0**: Caddy, Coolify, Llama models
- **Public Domain**: SQLite
- **AGPL-3.0**: MinIO (only if used)

**Zero proprietary dependencies. Zero API keys. Zero vendor lock-in.**
