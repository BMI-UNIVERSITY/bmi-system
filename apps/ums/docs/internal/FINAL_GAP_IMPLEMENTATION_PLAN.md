# BMI UMS — Final Gap Implementation Plan

This document serves as the single source of truth for the remaining implementation tasks for the BMI University Management System. It synthesizes findings from the Revision 2 Architecture Report, the Code Quality Audit, and the Feature Analysis.

---

## **Phase 1: Foundation & Security (Critical — First 72 Hours)**
*Focus: Eliminating data loss risk and closing critical security exposures.*

### **1.1 Infrastructure & Deployment**
- [x] **Activate Litestream → Cloudflare R2 Replication**: Placeholder variables updated in `litestream.yml`; logic added to `docker-compose.yml`.
- [x] **Pin Docker Image Tags**: All services in `docker-compose.yml` and `backend/Dockerfile` pinned to specific versions.
- [x] **ARM Architecture Support**: Added `platform: linux/arm64` to all services in `docker-compose.yml`.
- [x] **Memory Limits & Log Rotation**: Defined `mem_limit` and Docker log rotation for all containers.
- [x] **Fix Production Volume Mounts**: Removed dev bind-mounts from production `api` service.

### **1.2 Security Hardening**
- [x] **Block PocketBase Admin Panel**: Added Caddyfile rule to restrict `/_/*` access.
- [ ] **OCI Security Groups**: Configure Oracle Cloud Security Groups to only allow ports 80, 443, 443/udp (HTTP/3), and 51820/udp (WireGuard).
- [ ] **SSH & Server Hardening**: Disable password SSH auth, enable Fail2Ban, and configure UFW on the primary Oracle instance.
- [ ] **WireGuard VPN**: Install and configure WireGuard between the primary Oracle server and the standby server for secure admin access and inter-server sync.
- [x] **MFA for Privileged Roles**: Enforced TOTP MFA for `admin`, `registrar`, and `staff` roles in the login flow (Backend + Frontend).

### **1.3 Database & Schema**
- [x] **Stop Runtime Schema Mutation**: `setupCollections()` made read-only; `ensureSchema` disabled in production.
- [x] **Database Indexes**: Verified all 27 identified indexes are correctly applied via migrations.

---

## **Phase 2: Reliability & Observability (High — First 2 Weeks)**
*Focus: Ensuring the system is measurable, recoverable, and tested.*

### **2.1 Disaster Recovery**
- [ ] **Standby VPS Deployment**: Provision the standby server (Contabo or Truehost) and perform a full restore drill from Litestream.
- [ ] **Syncthing for File Replication**: Set up Syncthing to replicate `pb_public/` (uploads, certificates) from primary to standby in real-time.
- [ ] **Weekly Restic Backups**: Configure Restic to take encrypted weekly snapshots of all data and configs to Backblaze B2.

### **2.2 Observability**
- [ ] **Uptime Kuma**: Deploy Uptime Kuma on the standby server to monitor the primary's health endpoints with Telegram/Email alerts.
- [x] **Structured Logging & Metrics**: Implemented Correlation IDs, request context, metrics, alerting, and secured admin endpoints.
- [x] **Deep Health Endpoint**: Implemented `/api/v1/health/deep` to check the status of API, PocketBase, and Ollama in one call.
- [x] **Technical Hygiene**: Resolved all IDE diagnostics and TypeScript "Problems" identified in the codebase.

### **2.3 Testing & Quality**
- [x] **Integration Test Suite**: Expanded backend tests to run against a real test PocketBase instance in CI.
- [x] **CI Enforcement**: Configured GitHub Actions to block merges on failing tests, typechecks, and security audits.
- [x] **OpenAPI Sync**: Automated spec generation from Zod schemas with validation script.

---

## **Phase 3: Product Maturity & Compliance (Medium — 30–60 Days)**
*Focus: Advanced features, compliance, and user self-service.*

### **3.1 Accessibility & UX**
- [x] **WCAG 2.1 AA Audit**: Integrated `axe-core` and created `checkA11y` test helper to enforce compliance in components.
- [x] **PWA & Offline Support**: Configured `vite-plugin-pwa` with `NetworkFirst` caching for API reads and full offline shell support.

### **3.2 Academic & Student Features**
- [x] **Expanded Student Portal**: Added profile updates, document requests (Transcript/Certificate), and fee summary views.
- [x] **Faculty Portal Enhancements**: Implemented grade appeal review workflow (Approve/Deny) and API services.
- [x] **Notifications**: Implemented notification service and real-time Notification Center (Email/System).

### **3.3 Data Privacy & Compliance**
- [x] **Data Retention Policy**: Automated cleanup service for audit logs (90d), visitors (30d), and notifications (30d).
- [x] **Subject Access Rights**: Implemented Data Export and "Right to be Forgotten" (Scrubbing) workflows.

---

## **Phase 4: Advanced Features & Scaling (Long-term)**
*Focus: Multi-system integration and internationalization.*

- [x] **Internationalization (i18n)**: Implemented scalable architecture using `i18next-http-backend` and `i18next-browser-languagedetector`. Supports **English, Swahili, Spanish, French, and Arabic** via external JSON files in `/public/locales`.
- [x] **LMS Integration**: Implemented LTI 1.3 OIDC and Launch skeleton in [lti.ts](file:///d%3A/AGENTS/bmi-ums/backend/src/routes/lti.ts).
- [x] **Timetabling & Rubrics**: 
    - Implemented academic scheduling system with collision detection in [timetabling.ts](file:///d%3A/AGENTS/bmi-ums/backend/src/routes/timetabling.ts).
    - Created [Timetable.tsx](file:///d%3A/AGENTS/bmi-ums/src/components/Timetable.tsx) and [RubricBuilder.tsx](file:///d%3A/AGENTS/bmi-ums/src/components/grading/RubricBuilder.tsx) for academic management.
- [ ] **PostgreSQL Migration**: Monitor write contention and migrate from SQLite to PostgreSQL if the institution exceeds 2,000+ concurrent users.

---

## **Retired Documents**
The following documents have been replaced by this plan and should be considered obsolete:
- `ACCURATE_DATA_IMPORT_GUIDE.md`
- `ADD_MARTIN_GRADES_GUIDE.md`
- `ADMIN_SETUP_REQUIRED.md`
- `AUTO_SYNC_SETUP.md`
- `DATA_IMPORT_READY.md`
- `DATA_RESTORATION_GUIDE.md`
- `DEPLOYMENT_GUIDE.md`
- `FINAL_IMPORT_INSTRUCTIONS.md`
- `FINAL_SETUP_INSTRUCTIONS.md`
- `GRADE_SYNC_FIX.md`
- `MARTIN_GRADES_LOCATION_AND_IMPORT.md`
- `RESTORE_DATA_QUICK_START.md`
- `RESTORE_WITH_YOUR_CREDENTIALS.md`
- `RUN_IMPORT_NOW.md`
- `RUN_IMPORT_WITH_GRADE_FIX.md`
- `STARTUP_CONSOLIDATION.md`
- `START_HERE.md`
- `START_HERE_GRADE_FIX.md`
- `SYNC_TO_SHEETS_GUIDE.md`
- `VERIFICATION_PORTAL_SETUP.md`
- `docs/implementation-guide.md`
- `docs/project-status.md`
- `AUDIT/ROADMAP_TODO.md`
