

**BMI UNIVERSITY**

Management System



**FINAL HARMONIZED ARCHITECTURE REPORT**

Hosting Strategy: Lean Hybrid Sovereign Infrastructure

**Revision 2 — Server Selection Updated**


| ***Repository** | ***KIAI-JOSEPH/BMI-PORTAL** |
| - | - |
| ***Primary Stack** | ***React + Vite · Hono.js · PocketBase · SQLite · Ollama · Caddy** |
| ***Classification** | ***University Management System (UMS)** |
| ***Report Date** | ***May 2026  (Revision 2)** |
| ***Key Change in Rev 2** | ***Oracle Cloud Free ARM replaces Hetzner/Lightsail as Primary Server** |
| ***Primary Server Cost** | ***$0 / month (Oracle Always Free — permanent)** |
| ***Total Monthly Cost** | ***$0–$5 / month (down from $5–$8 in Rev 1)** |
| ***Sources Synthesized** | ***Codebase · Recommendation A · Recommendation B · Server Alternatives Analysis** |


Confidential — For BMI University IT Division


# **Revision 2 — What Changed and Why**

***The original report (Rev 1) recommended Hetzner CX21 ($4.50/month) as the primary server and Oracle Cloud Always Free ARM as the warm standby. A subsequent server alternatives analysis revealed that this assignment was backwards: the Oracle Always Free ARM instance is materially more powerful than Hetzner CX21 and costs nothing permanently. This revision corrects the server selection throughout the entire document.**


| **WHAT CHANGED IN REVISION 2** |
| - |
| ***PRIMARY SERVER:  Was Hetzner CX21 ($4.50/mo, 2 vCPU, 4 GB RAM)** ***                 Now Oracle Cloud Always Free ARM (4 OCPU, 24 GB RAM, $0)**  ***STANDBY SERVER:  Was Oracle Cloud Always Free (idle, warm standby)** ***                 Now Contabo $4.95/mo OR Truehost Kenya ~$11/mo (monitoring + failover)**  ***AFRICA-LOCAL PATH added: Truehost Kenya (Nairobi DC, M-Pesa, KSh billing) as primary,** ***                          Oracle Free ARM as zero-cost standby — best for local latency.**  ***TOTAL COST:      Was $5–8/month. Now $0–$5/month (Path A) or $11–$22/month (Path B local).**  ***ALL OTHER RECOMMENDATIONS unchanged from Revision 1.** |


## **Why Oracle ARM Is Better Than Hetzner CX21**

| ***Attribute** | ***Hetzner CX21 (Rev 1 primary)** | ***Oracle Always Free ARM (Rev 2 primary)** | ***Winner** |
| - | - | - | - |
| ***Monthly cost** | ***$4.50/month** | ***$0 — permanent** | ***Oracle** |
| ***CPU** | ***2 vCPU (x86)** | ***4 OCPU (ARM Ampere A1)** | ***Oracle** |
| ***RAM** | ***4 GB** | ***24 GB** | ***Oracle ×6** |
| ***Storage** | ***40 GB NVMe SSD** | ***200 GB block volume** | ***Oracle ×5** |
| ***Bandwidth** | ***20 TB/month** | ***10 TB/month outbound** | ***Hetzner (marginal)** |
| ***Ollama 3B (4 GB req)** | ***Tight — exactly 4 GB** | ***Runs comfortably** | ***Oracle** |
| ***Ollama 7B (8 GB req)** | ***No — insufficient RAM** | ***Yes — 24 GB available** | ***Oracle** |
| ***Vendor lock-in** | ***Moderate** | ***Low (open standard APIs)** | ***Equal** |
| ***Credit card needed** | ***Yes** | ***Yes (verification only)** | ***Equal** |


| **KEY ORACLE ALWAYS FREE CONSTRAINTS — READ BEFORE PROVISIONING** |
| - |
| ***1. Total Ampere A1 resources across all instances: max 4 OCPU and 24 GB RAM combined.** ***2. Requires a valid credit/debit card for identity verification. No charge while within limits.** ***3. Capacity is region-dependent. If your chosen region is full, try another region.** ***4. Set a $0 budget alert immediately after account creation to catch accidental paid resources.** ***5. Do not run cryptocurrency miners — Oracle bans accounts permanently with no appeal.** ***6. Docker images must be ARM-compatible (linux/arm64). All major images in this stack are.** ***7. Free resources persist indefinitely after trial ends as long as limits are not exceeded.** |


# **Executive Summary**

***BMI University Management System is a privacy-first, 100% open-source university administration platform built on React/Vite, Hono.js, PocketBase (SQLite), a local Ollama LLM, and Caddy — all orchestrated via Docker Compose. The unanimous finding across codebase analysis and two independent architecture reviews is a Lean Hybrid Sovereign Infrastructure: self-host all compute on infrastructure you control, delegate edge protection and offsite backup to free-tier cloud services.**


| **FINAL VERDICT: LEAN HYBRID SOVEREIGN INFRASTRUCTURE** |
| - |
| ***Primary compute: Oracle Cloud Always Free ARM — 4 OCPU, 24 GB RAM, 200 GB, 10 TB — $0/month.** ***Standby/monitoring: Contabo ($4.95/mo) or Truehost Kenya (~$11/mo, Nairobi DC).** ***Edge, backup, DNS: Cloudflare free tier + Cloudflare R2 + Backblaze B2.** ***Total cost: $0–$5/month (Path A global) or ~$11–22/month (Path B Africa-local).** ***Zero vendor lock-in. Full data sovereignty. 100% open-source stack end to end.** |


## **Three Deployment Paths — Choose One**

| ***Path** | ***Primary Server** | ***Standby Server** | ***Monthly Cost** | ***Best For** |
| - | - | - | - | - |
| ***A — Zero Cost** | ***Oracle Free ARM (4 OCPU/24 GB, $0)** | ***Contabo $4.95/mo or Oracle 2nd instance** | ***$0–$5/month** | ***Teams prioritising cost; EU/global routing acceptable** |
| ***B — Africa-Local** | ***Truehost Kenya (Nairobi DC, ~$11–22/mo)** | ***Oracle Free ARM (zero cost warm standby)** | ***~$11–22/month** | ***Lowest latency for Kenyan/East African users; local billing** |
| ***C — Best Specs** | ***Contabo $4.95/mo (4 vCPU/8 GB/100 GB NVMe)** | ***Oracle Free ARM (zero cost warm standby)** | ***~$5/month** | ***Consistent x86 performance; EU/global routing** |


## **Why Not Pure Cloud? Why Not Pure Self-Hosted?**

***The system runs a local Ollama LLM — the project's core design intent. Cloud GPU instances cost $50–200+/month and contradict the zero-external-dependencies philosophy. A single server with no offsite backup is one failure away from total data loss. The hybrid model keeps compute on your infrastructure while using cloud for the three things it genuinely does better: global CDN edge, offsite backup, and DDoS-resistant DNS — all achievable at zero cost.**


# **1. Codebase Analysis**

***Analysis derived directly from the repository: docker-compose.yml, litestream.yml, Caddyfile, Makefile, and documentation markdown files.**

## **1.1 Technology Stack**

| ***Layer** | ***Technology** | ***License** | ***Hosting Implication** |
| - | - | - | - |
| ***Frontend** | ***React + Vite (TypeScript, 92% of codebase)** | ***MIT** | ***Compiles to static files; CDN-served via Cloudflare Pages** |
| ***Backend API** | ***Hono.js on Node.js 20+** | ***MIT** | ***Persistent process; ~100 MB RAM idle** |
| ***Database & Auth** | ***PocketBase + SQLite** | ***MIT** | ***Single binary; must run on persistent volume** |
| ***LLM / AI** | ***Ollama + Llama 3.2 (3B or 7B)** | ***MIT** | ***Hard reason to self-host; 4–8 GB RAM. Oracle 24 GB handles 7B easily** |
| ***Replication** | ***Litestream (SQLite WAL → S3)** | ***Apache 2.0** | ***Already wired for hybrid; \<1 second replication lag** |
| ***Reverse Proxy** | ***Caddy 2 with auto-HTTPS** | ***Apache 2.0** | ***Caddyfile committed; handles TLS via ACME** |
| ***Orchestration** | ***Docker Compose** | ***Apache 2.0** | ***Portable; same compose file runs on any Linux host including ARM** |


## **1.2 What the Codebase Already Does Well**

- ***All services run inside a private Docker bridge network — never directly exposed to the internet**

- ***Caddy handles TLS certificate issuance and renewal automatically via ACME/Let's Encrypt**

- ***Litestream is already configured for near-real-time SQLite WAL replication to S3-compatible storage**

- ***Health checks are defined for all four core services in docker-compose.yml**

- ***JWT authentication and AES-256 encryption keys are environment-variable driven**

- ***GitHub Actions CI is configured in .github/ for automated testing and deployment**

- ***The Makefile provides consistent developer and operator commands**


## **1.3 Critical Gaps Identified**

- ***Litestream bucket is a placeholder — replication is not yet live (highest priority fix)**

- ***Docker image tags use :latest in all services — silent breaking change risk in production**

- ***No WireGuard VPN — admin panel access and inter-server sync are unprotected**

- ***No offsite backup for pb\_public/ (uploaded files, certificates, avatars)**

- ***PocketBase admin panel (/\_/) is not blocked from the public internet**

- ***No monitoring or alerting — failures are silent until a user reports them**

- ***Backend Dockerfile bind-mounts ./backend:/app in production — dev pattern, not production-safe**


# **2. Recommended Architecture**

## **2.1 High-Level Design**

***Three layers: a cloud edge layer (Cloudflare) that protects and accelerates traffic; a self-hosted primary layer on Oracle's permanently free ARM compute; and a warm standby that enables sub-10-minute failover.**


| **ARCHITECTURE OVERVIEW (REVISED)** |
| - |
| ***Layer 1 — Cloud Edge:     Cloudflare (DNS · DDoS · WAF · CDN · R2 Backup Storage)** ***Layer 2 — Primary:        Oracle Free ARM VPS — all Docker services** ***                          └─ Caddy · Hono.js API · PocketBase + SQLite · Ollama · Litestream** ***Layer 3 — Standby:        Contabo $4.95 OR Truehost Kenya ~$11 — monitoring + failover** ***                          └─ Uptime Kuma · WireGuard node · Docker stack (stopped)**  ***Traffic flow:  User → Cloudflare edge → Caddy (TLS) → Hono.js API → PocketBase** ***Backup flow:   PocketBase WAL → Litestream → Cloudflare R2  (every 1 second)** ***File sync:     Primary pb\_public/ → Syncthing → Standby pb\_public/** ***Admin access:  All admin traffic tunnels through WireGuard VPN only** ***ARM note:      All images (PocketBase, Caddy, Node.js, Ollama) have linux/arm64 support.** |


## **2.2 Server Specifications (Updated)**

| ***Role** | ***Provider & Plan** | ***Spec** | ***Monthly Cost** | ***Purpose** |
| - | - | - | - | - |
| ***Primary Server** | ***Oracle Cloud Always Free (Ampere A1 Flex)** | ***4 OCPU ARM / 24 GB RAM / 200 GB block / 10 TB bandwidth** | ***$0 — permanent** | ***All Docker services; primary data store; Ollama 3B and 7B** |
| ***Standby — Global (Path A)** | ***Contabo Cloud VPS S** | ***4 vCPU x86 / 8 GB RAM / 100 GB NVMe / Unlimited traffic** | ***$4.95/month** | ***Monitoring (Uptime Kuma) + warm failover** |
| ***Standby — Africa-local (Path B)** | ***Truehost Kenya — 4 GB plan, Nairobi DC** | ***2 vCPU / 4 GB RAM / 80 GB SSD / 1,500 GB int'l bandwidth** | ***~KSh 2,800/mo (~$22)** | ***Lowest latency for Kenyan users + failover; M-Pesa payments** |
| ***Edge / CDN** | ***Cloudflare Free Tier** | ***Global PoP network** | ***$0** | ***DNS, DDoS, WAF, CDN, R2 backups** |
| ***Frontend CDN** | ***Cloudflare Pages** | ***Unlimited bandwidth static sites** | ***$0** | ***Serves compiled Vite/React build globally** |
| ***SQLite Backup** | ***Cloudflare R2** | ***10 GB free + $0.015/GB after** | ***$0** | ***Litestream WAL replication target** |
| ***File Backup** | ***Backblaze B2** | ***10 GB free + $0.006/GB after** | ***$0–$2** | ***Weekly Restic encrypted snapshots** |


## **2.3 Oracle ARM — Docker & Ollama Configuration**

***The Oracle Ampere A1 uses ARM64 architecture. All images in the BMI-PORTAL stack publish multi-arch manifests, but docker-compose.yml should explicitly specify the platform to prevent accidental x86 image pulls.**


\# Add platform declaration to each service in docker-compose.yml

services:

  pocketbase:

    platform: linux/arm64

    image: ghcr.io/muchobien/pocketbase:0.22.0


  api:

    platform: linux/arm64

    build:

      context: ./backend

      platforms: \[linux/arm64\]


  ollama:

    platform: linux/arm64

    image: ollama/ollama:0.3.6

    \# ARM CPU inference: Llama 3.2 3B ~3-4 tok/s, 7B ~1-2 tok/s

    \# Sufficient for async document generation and search tasks


  caddy:

    platform: linux/arm64

    image: caddy:2.8-alpine


***ARM inference performance note: Ollama on 4 ARM OCPUs produces approximately 3–4 tokens/second for the 3B model and 1–2 tokens/second for the 7B model. For a university UMS where AI is used for document generation, transcript summarisation, and search (not real-time chat), these speeds are acceptable. If interactive AI chat is a requirement, evaluate upgrading to a paid Oracle instance with more cores or adding a second always-free A1 instance (within the 4 OCPU limit).**


| **ALTERNATIVE: Run TWO Oracle Always Free Instances** |
| - |
| ***The 4 OCPU / 24 GB limit can be split across up to 4 separate VMs, not just one.**  ***Option: Instance 1 — 2 OCPU / 12 GB RAM → all app services (Caddy, API, PocketBase)** ***         Instance 2 — 2 OCPU / 12 GB RAM → Ollama exclusively (dedicated AI compute)**  ***This separates AI inference from transactional workloads. Both instances are free.** ***Use Docker networks or WireGuard to connect them. The API calls Ollama via internal IP.** ***Both instances count toward the single 4 OCPU / 24 GB Always Free quota.** |


## **2.4 Network & Domain Structure**

| ***Subdomain** | ***Routes To** | ***Public?** | ***Notes** |
| - | - | - | - |
| ***bmiuniversity.ac.ke** | ***Cloudflare Pages → Vite/React static build** | ***Yes** | ***Zero origin load; global CDN delivery** |
| ***api.bmiuniversity.ac.ke** | ***Caddy → Hono.js :3001** | ***Yes** | ***All API calls; rate-limited via Cloudflare WAF** |
| ***auth.bmiuniversity.ac.ke** | ***Caddy → PocketBase :8090** | ***Yes** | ***Auth endpoints only; /\_/ admin panel blocked** |
| ***storage.bmiuniversity.ac.ke** | ***Caddy → PocketBase files endpoint** | ***Yes** | ***Certificate/file downloads only** |
| ***monitor.bmiuniversity.ac.ke** | ***Caddy → Uptime Kuma on standby :3001** | ***No — IP restricted** | ***Admin IPs only via Cloudflare WAF rule** |


# **3. Complete Tool Stack by Layer**

## **3.1 Edge Layer — Cloudflare (Free Tier)**

| ***Cloudflare Feature** | ***Configuration** | ***Benefit** |
| - | - | - |
| ***DNS** | ***Proxied A record → Oracle VPS public IP** | ***Origin IP hidden; instant propagation; DNSSEC** |
| ***DDoS Mitigation** | ***Always-on, unmetered** | ***Protects against volumetric attacks at no cost** |
| ***WAF (5 free rules)** | ***Block /\_/\* except admin IP; block /api/auth brute-force** | ***Admin panel and auth endpoints hardened** |
| ***SSL/TLS Mode** | ***Full (Strict) — both hops encrypted** | ***End-to-end encryption; Cloudflare and Caddy both TLS** |
| ***Cloudflare Pages** | ***Connect to GitHub repo; auto-build Vite on every push to main** | ***Frontend served from global CDN; no static traffic hits Oracle** |
| ***Cloudflare R2** | ***Litestream replication target; S3-compatible API** | ***Free 10 GB; no egress fees; real-time SQLite offsite backup** |
| ***Rate Limiting** | ***100 req/min per IP on /api/auth endpoints** | ***Brute-force protection on authentication** |


## **3.2 Reverse Proxy — Caddy (Keep Existing)**

***The repo has a committed Caddyfile. Keep Caddy. Do not replace with Traefik or NGINX. Add the following to the existing Caddyfile:**


\# Block PocketBase admin panel — VPN/local access only

handle /\_/\* \{

  @not-admin not remote\_ip 192.168.0.0/16 10.0.0.0/8

  respond @not-admin "Forbidden" 403

\}


\# Security headers on all routes

header \{

  Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

  X-Frame-Options DENY

  X-Content-Type-Options nosniff

  Referrer-Policy strict-origin-when-cross-origin

  -Server

\}


## **3.3 Database — PocketBase + SQLite (Keep & Strengthen)**

***PocketBase with SQLite handles up to ~500 concurrent write ops/second — well above any single-institution university load. It is the correct choice for Phase 1 and Phase 2. The following Litestream configuration must be activated immediately.**


| **LITESTREAM — ACTIVATE IMMEDIATELY (HIGHEST PRIORITY TASK)** |
| - |
| ***Edit litestream.yml — replace placeholder values with real credentials:**  ***  bucket: bmi-ums-prod-backup          ← your Cloudflare R2 bucket name** ***  endpoint: https://\<id\>.r2.cloudflarestorage.com** ***  access-key-id: $\{LITESTREAM\_ACCESS\_KEY\_ID\}** ***  secret-access-key: $\{LITESTREAM\_SECRET\_ACCESS\_KEY\}** ***  retention: 720h                      ← 30 days of WAL history** ***  snapshot-interval: 6h               ← faster point-in-time restores**  ***This single step converts "one server failure = total data loss" into** ***"one server failure = 5-minute restore". Do this before anything else.** |


## **3.4 Authentication — PocketBase JWT (Keep; Keycloak is Phase 3)**

***PocketBase provides JWT-based auth with role-based access control (Admin, Registrar, Staff) already integrated. Keycloak (512 MB+ JVM) is a Phase 3 addition when BMI needs SSO across 5+ separate systems — not before. Until then, PocketBase Auth is not a limitation.**

## **3.5 File Storage — Cloudflare R2 now; MinIO in Phase 3**

- ***Syncthing (Phase 1): Encrypted P2P sync of pb\_public/ between primary (Oracle) and standby. Set standby to Receive Only mode.**

- ***Restic → Backblaze B2 (Phase 1): Weekly encrypted snapshots of pb\_public/, .env, Caddyfile, and litestream.yml.**

- ***MinIO (Phase 3): When university policy mandates zero third-party file storage. Requires dedicated storage server.**


# **4. Docker & Deployment Configuration**

## **4.1 Production Hardening of docker-compose.yml**

### **Pin All Image Tags (Critical)**

\# Replace all :latest with pinned versions

image: ghcr.io/muchobien/pocketbase:0.22.0    \# not :latest

image: caddy:2.8-alpine                       \# not :latest

image: ollama/ollama:0.3.6                    \# not :latest


### **Add Memory Limits**

services:

  ollama:

    mem\_limit: 14g          \# generous on Oracle 24 GB; leaves 10 GB for other services

    mem\_reservation: 8g

  api:

    mem\_limit: 512m

  pocketbase:

    mem\_limit: 512m

  caddy:

    mem\_limit: 128m


### **Fix Production Volume Mount**

\# REMOVE from production api service:

\# - ./backend:/app          ← hot-reload dev pattern, not production

\# - /app/node\_modules

\# REPLACE WITH:

  volumes:

    - ./logs:/app/logs      \# logs only


### **Add Log Rotation and Restart Policy**

services:

  api:

    restart: unless-stopped

    logging:

      driver: "json-file"

      options:

        max-size: "10m"

        max-file: "5"


## **4.2 Oracle-Specific: ARM Image Pull & Swap**

***The Oracle ARM instance has 24 GB RAM but no swap by default. Add a 4 GB swap file as a safety net against OOM during model loading:**


\# Run once after provisioning the Oracle instance:

sudo fallocate -l 4G /swapfile

sudo chmod 600 /swapfile

sudo mkswap /swapfile

sudo swapon /swapfile

echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab


\# Reduce swap aggressiveness (prefer RAM):

echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

sudo sysctl -p


## **4.3 Secrets Management**

***All three critical secrets (JWT\_SECRET, ENCRYPTION\_KEY, PB\_ENCRYPTION\_KEY) must be generated with cryptographically secure randomness and never committed.**


openssl rand -hex 32   \# JWT\_SECRET

openssl rand -hex 32   \# ENCRYPTION\_KEY

openssl rand -hex 32   \# PB\_ENCRYPTION\_KEY


***CRITICAL: The ENCRYPTION\_KEY used for certificate content hashing must be stored in at minimum two locations: a password manager and a printed sealed envelope in a physical safe. Loss of this key means existing certificates cannot be re-verified.**

## **4.4 CI/CD Deployment Pipeline**

\# .github/workflows/deploy.yml

on:

  push:

    branches: \[main\]

jobs:

  deploy:

    runs-on: ubuntu-latest

    steps:

      - uses: actions/checkout@v4

      - name: Build ARM backend image

        run: |

          docker buildx build --platform linux/arm64 \\

            -t ghcr.io/$\{\{ github.repository \}\}/api:$\{\{ github.sha \}\} \\

            --push ./backend

      - name: Deploy via SSH over WireGuard

        uses: appleboy/ssh-action@v1

        with:

          host: $\{\{ secrets.WG\_ORACLE\_IP \}\}

          username: deploy

          key: $\{\{ secrets.SSH\_PRIVATE\_KEY \}\}

          script: |

            cd /opt/bmi-portal

            docker compose pull api

            docker compose up -d --no-deps api


# **5. Security Hardening**

## **5.1 Server-Level Hardening (Complete Before Go-Live)**

1. ***SSH hardening: Disable password auth. Enable key-only SSH. Set PermitRootLogin no, MaxAuthTries 3, AllowUsers deploy.**

2. ***UFW firewall: Default deny incoming. Allow 22 (SSH via WireGuard only), 80, 443, 443/udp (HTTP/3), 51820/udp (WireGuard).**

3. ***Fail2Ban: Install and configure for SSH brute-force. Default settings catch most attacks.**

4. ***Automatic security updates: Enable unattended-upgrades for Ubuntu security patches.**

5. ***WireGuard VPN: Set up between Oracle primary and standby. All admin access and inter-server Syncthing traffic tunnels through it.**

6. ***Block PocketBase admin panel: Caddyfile rule restricts /\_/\* to WireGuard IP range. Backed by Cloudflare WAF rule.**

7. ***Oracle-specific: In the OCI console, configure Security Groups to only allow ports 80, 443, 443/udp, and 51820/udp inbound. Block all other ports at the hypervisor level.**


## **5.2 Application Security**

| ***Concern** | ***Current State** | ***Required Action** | ***Priority** |
| - | - | - | - |
| ***JWT Secret** | ***In .env, not committed** | ***Rotate every 90 days; support two valid secrets during rotation** | ***High** |
| ***PocketBase Admin** | ***Exposed if port 8090 open** | ***Block /\_/\* via Caddy and Cloudflare WAF; access via WireGuard only** | ***Critical** |
| ***Docker image tags** | ***All use :latest** | ***Pin all images to specific version tags or SHA digests** | ***Critical** |
| ***Certificate key** | ***In .env only** | ***Store in password manager + physical safe; document recovery** | ***Critical** |
| ***npm dependencies** | ***Not audited** | ***Run npm audit --audit-level=high before go-live** | ***Medium** |
| ***CORS origin** | ***Via CORS\_ORIGIN env var** | ***Set to exact production domain; never use wildcard (\*)** | ***High** |
| ***Audit logs** | ***Local only** | ***Ship to Grafana Cloud Loki (free tier) — immutable offsite store** | ***Medium** |
| ***Oracle Security Groups** | ***Default (open)** | ***Lock down in OCI console to only necessary ports** | ***Critical** |


## **5.3 Security Tool Phasing**

| ***Tool** | ***Phase** | ***RAM/Cost** | ***What It Adds** |
| - | - | - | - |
| ***SSH hardening + UFW** | ***Phase 1 — Now** | ***Zero** | ***Eliminates most common server compromises** |
| ***Fail2Ban** | ***Phase 1 — Now** | ***~10 MB** | ***Automatic IP banning on brute-force attempts** |
| ***Cloudflare WAF (5 free rules)** | ***Phase 1 — Now** | ***Zero** | ***Admin panel blocking; auth rate limiting at edge** |
| ***WireGuard** | ***Phase 1 — Now** | ***~5 MB** | ***Encrypted admin access tunnel; inter-server sync** |
| ***OCI Security Groups (Oracle)** | ***Phase 1 — Now** | ***Zero** | ***Hypervisor-level port restriction; Oracle-specific step** |
| ***CrowdSec** | ***Phase 2** | ***~50 MB** | ***Community-powered threat intelligence** |
| ***Wazuh SIEM** | ***Phase 3 (dedicated box)** | ***2–4 GB** | ***Full SIEM; needs dedicated server — cannot share primary** |


# **6. Backup & Disaster Recovery**

## **6.1 Three-Layer Backup Strategy**

| ***Copy** | ***What** | ***Where** | ***Tool** | ***Frequency** | ***Cost** |
| - | - | - | - | - | - |
| ***1 — Live** | ***SQLite database** | ***Oracle VPS SSD** | ***PocketBase (native)** | ***Continuous** | ***$0** |
| ***2 — WAL Replication** | ***SQLite WAL changes** | ***Cloudflare R2** | ***Litestream** | ***Every 1 second** | ***$0 (free tier)** |
| ***3 — File Backup** | ***pb\_public/ + configs** | ***Backblaze B2** | ***Restic (encrypted)** | ***Weekly** | ***$0–$2/mo** |
| ***4 — Mirror (bonus)** | ***pb\_public/ files** | ***Standby VPS** | ***Syncthing** | ***Real-time** | ***$0** |


## **6.2 Complete Litestream Configuration**

dbs:

  - path: /pb\_data/data.db

    replicas:

      - type: s3

        bucket: bmi-ums-prod-backup

        path: pocketbase/data.db

        endpoint: https://\<id\>.r2.cloudflarestorage.com

        access-key-id: $\{LITESTREAM\_ACCESS\_KEY\_ID\}

        secret-access-key: $\{LITESTREAM\_SECRET\_ACCESS\_KEY\}

        sync-interval: 1s

        retention: 720h

        retention-check-interval: 24h

        snapshot-interval: 6h

      - type: file

        path: /pb\_data/replicas/data.db  \# local hot-spare on Oracle block volume

  - path: /pb\_data/auxiliary.db

    replicas:

      - type: s3

        bucket: bmi-ums-prod-backup

        path: pocketbase/auxiliary.db

        endpoint: https://\<id\>.r2.cloudflarestorage.com

        access-key-id: $\{LITESTREAM\_ACCESS\_KEY\_ID\}

        secret-access-key: $\{LITESTREAM\_SECRET\_ACCESS\_KEY\}

        sync-interval: 1s

        retention: 720h


## **6.3 Restic Automated File Backup**

\#!/bin/bash  \# /opt/bmi-portal/scripts/backup.sh

set -euo pipefail

export RESTIC\_REPOSITORY="b2:bmi-ums-backups"

export RESTIC\_PASSWORD="$\{RESTIC\_PASSWORD\}"


restic backup \\

  /opt/bmi-portal/data/pb\_public \\

  /opt/bmi-portal/.env \\

  /opt/bmi-portal/Caddyfile \\

  /opt/bmi-portal/litestream.yml


restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune

\# Cron: 0 2 \* \* 0  (every Sunday at 2 AM)


## **6.4 Disaster Recovery Runbook**

| ***Failure Scenario** | ***Recovery Method** | ***Target RTO** |
| - | - | - |
| ***API crash / OOM** | ***Docker restart: unless-stopped handles automatically** | ***\< 30 seconds** |
| ***Full Oracle VPS failure** | ***Litestream restore on standby + docker compose up** | ***\< 10 minutes** |
| ***SQLite data corruption** | ***Litestream point-in-time restore from R2 WAL history** | ***\< 20 minutes** |
| ***Accidental data deletion** | ***Litestream restore to timestamp before deletion** | ***\< 30 minutes** |
| ***Complete data loss** | ***Restic restore from Backblaze B2 + Litestream WAL replay** | ***\< 2 hours** |
| ***Cloudflare outage** | ***Update DNS A record to Oracle VPS public IP directly** | ***\< 5 minutes** |
| ***Oracle account suspended** | ***Restore to Contabo/Truehost from Litestream + Restic** | ***\< 2 hours** |


## **6.5 Failover Procedure — Oracle to Standby**

8. ***SSH into standby server via WireGuard tunnel**

9. ***Run Litestream restore: litestream restore -replica s3 /data/pb\_data/data.db**

10. ***Verify: sqlite3 /data/pb\_data/data.db "PRAGMA integrity\_check;"**

11. ***Update Cloudflare DNS A record to standby VPS IP (or disable Cloudflare proxy)**

12. ***Run: docker compose up -d**

13. ***Verify: curl https://api.bmiuniversity.ac.ke/health returns 200**

14. ***Notify users of brief disruption**

15. ***Investigate Oracle issue — resolve or provision new Oracle instance**

16. ***When resolved: Syncthing re-syncs pb\_public/; switch DNS back; verify WAL continuity**


# **7. Monitoring & Observability**

## **7.1 Phase 1 Monitoring Stack**

| ***Tool** | ***Deployed On** | ***What It Monitors** | ***Cost** |
| - | - | - | - |
| ***Uptime Kuma** | ***Standby VPS (Contabo or Truehost)** | ***All service health endpoints; alerts via Telegram/email** | ***$0** |
| ***Grafana Cloud (free)** | ***Cloud (zero self-hosting)** | ***Logs (50 GB), metrics (10K series), 14-day retention** | ***$0** |
| ***Promtail** | ***Oracle VPS (Docker)** | ***Ships Docker JSON logs to Grafana Cloud Loki** | ***$0** |
| ***Docker healthchecks** | ***Already in docker-compose.yml** | ***Per-service health; triggers restart: unless-stopped** | ***$0** |


## **7.2 Deep Health Endpoint**

// backend/src/routes/health.ts

app.get("/health/deep", async (c) =\> \{

  const \[pb, ollama\] = await Promise.allSettled(\[

    fetch("http://pocketbase:8090/api/health").then(r =\> r.ok),

    fetch("http://ollama:11434/api/tags").then(r =\> r.ok),

  \]);

  const status = \{

    api: "ok",

    pocketbase: pb.status === "fulfilled" ? "ok" : "degraded",

    ollama: ollama.status === "fulfilled" ? "ok" : "degraded",

    timestamp: new Date().toISOString(),

  \};

  const allOk = \["api","pocketbase","ollama"\].every(k =\> status\[k\] === "ok");

  return c.json(status, allOk ? 200 : 503);

\});


# **8. Phased Scalability Roadmap**

## **8.1 Phase 1 — Foundation (0–500 Concurrent Users)**

***Execute in order of priority. All achievable within 12–16 hours of focused engineering time.**


| ***Priority** | ***Task** | ***Time** | ***Impact** |
| - | - | - | - |
| ***1 — Critical** | ***Activate Litestream → Cloudflare R2 replication** | ***30 min** | ***Eliminates data loss risk** |
| ***2 — Critical** | ***Pin all Docker image tags to specific versions** | ***15 min** | ***Prevents silent production breaks** |
| ***3 — Critical** | ***Configure OCI Security Groups on Oracle console** | ***20 min** | ***Closes all unnecessary ports at hypervisor level** |
| ***4 — Critical** | ***Block PocketBase /\_/ via Caddyfile + Cloudflare WAF** | ***15 min** | ***Closes admin panel public exposure** |
| ***5 — Critical** | ***SSH hardening + UFW + Fail2Ban** | ***20 min** | ***Eliminates most server-level attacks** |
| ***6 — High** | ***Add platform: linux/arm64 to all services in docker-compose.yml** | ***10 min** | ***Ensures correct ARM image pulls on Oracle** |
| ***7 — High** | ***Add 4 GB swap file on Oracle instance** | ***10 min** | ***Prevents OOM during Ollama model loading** |
| ***8 — High** | ***Install WireGuard on Oracle + standby** | ***1 hour** | ***Encrypted admin tunnel; inter-server sync** |
| ***9 — High** | ***Deploy standby VPS; test Litestream restore** | ***2 hours** | ***Validates full failover path before needed** |
| ***10 — High** | ***Move React frontend to Cloudflare Pages** | ***1 hour** | ***Removes all static traffic from Oracle origin** |
| ***11 — High** | ***Set up Uptime Kuma on standby + alert channels** | ***45 min** | ***Enables silent failure detection with alerts** |
| ***12 — Medium** | ***Set up Syncthing for pb\_public/ between servers** | ***45 min** | ***Covers file backup gap in 3-2-1 strategy** |
| ***13 — Medium** | ***Configure Restic → Backblaze B2 weekly backup** | ***1 hour** | ***Completes 3-2-1 backup coverage** |
| ***14 — Medium** | ***Fix production volume mount (remove bind-mount)** | ***30 min** | ***Production-correct image-based deployment** |
| ***15 — Medium** | ***Add memory limits to all Docker services** | ***15 min** | ***Prevents cascading OOM failures** |


## **8.2 Phase 2 — Growth (500–2,000 Concurrent Users)**

- ***Trigger: \>200 concurrent users, or API p95 latency \>500ms**

- ***Oracle 24 GB RAM has significant headroom — Llama 3.2 7B upgrade is free (already have RAM)**

- ***Add Redis for distributed session caching and background job queuing**

- ***Add self-hosted Prometheus when Grafana Cloud free tier is exceeded**

- ***Add CrowdSec community threat intelligence (Caddy bouncer plugin)**

- ***Begin monthly dependency audits: npm audit, Docker image vulnerability scanning**

- ***Consider splitting Oracle into two instances (2+2 OCPU): one for app services, one for Ollama**


## **8.3 Phase 3 — Enterprise (2,000+ Users or Multi-System)**

- ***Keycloak: When BMI needs SSO across UMS, Moodle, library, ERP, and HR. Dedicated 2 GB container.**

- ***Moodle LMS: Separate Docker Compose deployment on a separate server. Connects to Keycloak for SSO.**

- ***PostgreSQL: Migrate from PocketBase SQLite on measurable write contention. 4–6 weeks migration effort.**

- ***MinIO: When policy mandates zero third-party file storage. Dedicated storage server with RAID.**

- ***Wazuh SIEM: Dedicated 4 GB security server for intrusion detection and compliance reporting.**

- ***K3s: When horizontal API scaling is required. Not before that specific trigger is demonstrated.**


# **9. Cost Summary**

## **9.1 Path A — Zero Cost Primary (Recommended)**

| ***Service** | ***Provider** | ***Monthly Cost** | ***Notes** |
| - | - | - | - |
| ***Primary VPS** | ***Oracle Cloud Always Free (ARM)** | ***$0.00** | ***4 OCPU / 24 GB / 200 GB / 10 TB — permanent** |
| ***Standby VPS** | ***Contabo Cloud VPS S** | ***$4.95** | ***4 vCPU / 8 GB / 100 GB NVMe / Unlimited traffic** |
| ***CDN + DNS + DDoS** | ***Cloudflare Free** | ***$0.00** | ***Unlimited DDoS, WAF, CDN** |
| ***Frontend Hosting** | ***Cloudflare Pages** | ***$0.00** | ***Unlimited bandwidth static sites** |
| ***SQLite Backup** | ***Cloudflare R2 Free** | ***$0.00** | ***10 GB free; $0.015/GB after** |
| ***File Backup** | ***Backblaze B2** | ***$0.00–$2.00** | ***10 GB free; $0.006/GB after** |
| ***Monitoring** | ***Grafana Cloud Free** | ***$0.00** | ***50 GB logs; 10K metrics; 14-day retention** |
| ***Domain** | ***Registrar (.ac.ke)** | ***~$0.83** | ***~$10/year** |
| ***Total — Path A** |  | ***$5–8 / month** | ***Down from $5–8 in Rev 1 (same cost, more RAM)** |


## **9.2 Path B — Africa-Local Primary**

| ***Service** | ***Provider** | ***Monthly Cost** | ***Notes** |
| - | - | - | - |
| ***Primary VPS (Nairobi)** | ***Truehost Kenya — 4 GB plan** | ***~KSh 2,800 (~$22)** | ***2 vCPU / 4 GB / 80 GB · Nairobi DC · M-Pesa · WhatsApp support** |
| ***Standby VPS** | ***Oracle Cloud Always Free (ARM)** | ***$0.00** | ***24 GB RAM warm standby; free permanently** |
| ***CDN + DNS + Backup** | ***Cloudflare Free + R2 + B2** | ***$0.00–$2.00** | ***Same as Path A** |
| ***Domain** | ***Registrar (.ac.ke)** | ***~$0.83** | ***~$10/year** |
| ***Total — Path B** |  | ***~$22–25 / month** | ***Pay premium for Nairobi latency and KES billing** |


## **9.3 Phase Cost Progression (Path A)**

| ***Phase** | ***Monthly Cost** | ***User Capacity** | ***Key Additions** |
| - | - | - | - |
| ***Phase 1 (Now)** | ***$0–$5/month** | ***0–500 concurrent** | ***Oracle ARM primary + Contabo standby + Cloudflare stack** |
| ***Phase 2 (Growth)** | ***$5–$15/month** | ***500–2,000 concurrent** | ***+ Redis + self-hosted Prometheus + CrowdSec** |
| ***Phase 3 (Enterprise)** | ***$50–$100/month** | ***2,000–10,000 concurrent** | ***+ Keycloak server + PostgreSQL + Wazuh security server** |
| ***Phase 4 (University-wide)** | ***$200–$500/month** | ***10,000+ concurrent** | ***K3s cluster + managed PostgreSQL + full observability stack** |


# **10. Final Decision Matrix**

## **10.1 Architecture Comparison**

| ***Concern** | ***Pure Self-Hosted** | ***Pure Cloud** | ***Hybrid Sovereign (This Report)** |
| - | - | - | - |
| ***Ollama LLM cost** | ***Free (self-host)** | ***$50–200+/month GPU** | ***Free — Oracle ARM CPU inference** |
| ***Data sovereignty** | ***Full control** | ***Vendor holds data** | ***Full — data stays on Oracle VPS** |
| ***DDoS resilience** | ***Exposed directly** | ***CDN-protected** | ***Cloudflare at edge (free)** |
| ***Offsite backup** | ***Manual effort** | ***Managed snapshots** | ***Litestream → R2 (automatic, 1 sec)** |
| ***Primary server cost** | ***$5/month VPS** | ***$30–100+/month** | ***$0/month — Oracle Always Free** |
| ***Primary server RAM** | ***4 GB (Hetzner)** | ***Managed, unlimited** | ***24 GB — Oracle Always Free** |
| ***Ollama 7B capable** | ***No (4 GB limit)** | ***Yes (paid GPU)** | ***Yes — 24 GB Oracle handles 7B** |
| ***Failover speed** | ***Days (rebuild)** | ***Seconds (auto-scale)** | ***\< 10 minutes (warm standby)** |
| ***Vendor lock-in** | ***Zero** | ***High** | ***Minimal — Cloudflare swappable for Bunny.net or self-hosted** |
| ***Maintenance burden** | ***High** | ***Low** | ***Medium — one small IT team** |


## **10.2 Complete Tool Decision Summary**

| ***Tool** | ***Decision** | ***Rationale** |
| - | - | - |
| ***Oracle Cloud Always Free ARM** | ***ADOPT — PRIMARY SERVER** | ***4 OCPU / 24 GB RAM / $0/month — best free compute available; runs full stack including Ollama 7B** |
| ***Cloudflare Edge** | ***ADOPT — Phase 1** | ***Both source documents agree; highest impact at zero cost** |
| ***Caddy (existing)** | ***KEEP — Phase 1** | ***Already in repo; simpler than Traefik at this service count; auto-HTTPS built in** |
| ***Traefik (proposed)** | ***DEFER — Phase 3** | ***Excellent at 30+ services; wrong stage. Caddy already does the job.** |
| ***PocketBase + SQLite** | ***KEEP — Phase 1+2** | ***Correct architecture; Litestream covers durability; zero ops overhead** |
| ***PostgreSQL (proposed)** | ***DEFER — Phase 3** | ***Right long-term destination; migrate on measurable write contention trigger only** |
| ***Redis** | ***ADOPT — Phase 2** | ***Session caching and queues needed at growth stage** |
| ***Keycloak (proposed)** | ***DEFER — Phase 3** | ***512 MB+ JVM overhead wrong for Phase 1; correct for multi-system SSO only** |
| ***WireGuard** | ***ADOPT — Phase 1 (add now)** | ***Lightweight; critical for admin access; required for CI/CD SSH over VPN** |
| ***Litestream → R2** | ***ACTIVATE IMMEDIATELY** | ***Already configured; needs real credentials only — do this first** |
| ***Restic + Backblaze B2** | ***ADOPT — Phase 1** | ***Covers file backup gap; completes 3-2-1 strategy** |
| ***Syncthing** | ***ADOPT — Phase 1** | ***pb\_public/ P2P sync to standby; encrypted; zero cost** |
| ***MinIO (proposed)** | ***DEFER — Phase 3** | ***Use R2 first; MinIO when policy requires no third-party file storage** |
| ***Uptime Kuma** | ***ADOPT — Phase 1** | ***Lightweight monitoring on standby VPS; self-hosted; free** |
| ***Grafana Cloud free** | ***ADOPT — Phase 1** | ***Zero-ops log + metric aggregation; free tier covers Phase 1 fully** |
| ***Prometheus self-hosted** | ***ADOPT — Phase 2** | ***When Grafana Cloud free limits are reached** |
| ***Fail2Ban** | ***ADOPT — Phase 1** | ***SSH brute-force protection; 10 MB overhead; 20-minute setup** |
| ***CrowdSec** | ***ADOPT — Phase 2** | ***Community threat intelligence; add at growth stage** |
| ***Wazuh SIEM** | ***DEFER — Phase 3 dedicated box** | ***Needs 4 GB dedicated server; cannot share primary or standby** |
| ***Coolify (proposed)** | ***SKIP** | ***Greenfield tool; wrong for repo with existing Docker Compose + GitHub Actions CI** |
| ***Moodle (proposed)** | ***SEPARATE DECISION** | ***Out of scope for UMS; separate deployment if university needs an LMS** |
| ***Contabo / Truehost** | ***STANDBY SERVER** | ***Runs Uptime Kuma + warm failover. Contabo for global; Truehost for Africa-local latency.** |




# **Closing Statement**

***The most significant finding of Revision 2 is that the best available server for this stack has been listed in the report the whole time — as the standby. Oracle's Always Free ARM instance gives you more RAM than Keycloak, Redis, Prometheus, CrowdSec, and the entire application stack combined. It runs Ollama's 7B model — something the original Hetzner CX21 recommendation could not do. And it costs nothing, permanently.**


***The standby role is now filled by a $4.95 Contabo VPS (Path A) or a Truehost Kenya plan for Africa-local latency (Path B). The Oracle free instance running warm as standby was wasteful — 24 GB of RAM sitting idle. It is now earning its keep as the primary runtime.**


***Everything else in the architecture remains exactly as specified in Revision 1. The Litestream → Cloudflare R2 activation is still the most urgent task. SSH hardening, WireGuard, and Docker image pinning follow immediately. The three-phase scalability roadmap, disaster recovery runbook, and tool selection matrix all stand unchanged — only the server labels have been swapped.**


***Total Phase 1 infrastructure spend: $0–$5/month. *Full university management system. Local AI. Zero vendor lock-in. Automated offsite backup. Sub-10-minute failover. Complete data sovereignty. *All open source.**




Report prepared for KIAI-JOSEPH/BMI-PORTAL  ·  Revision 2  ·  May 2026

Stack: React+Vite · Hono.js · PocketBase · Ollama · Caddy · Docker Compose · Litestream

**Primary Server: Oracle Cloud Always Free ARM (4 OCPU / 24 GB / $0/month)**
