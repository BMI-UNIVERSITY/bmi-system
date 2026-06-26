# Northflank Deployment Guide for BMI UMS

## Overview

This guide walks you through deploying the BMI University Management System to Northflank's free tier ($20/month credits).

**GitHub Repository:** https://github.com/KIAI-JOSEPH/BMI-PORTAL

---

## Prerequisites

- ✅ Northflank account (sign up at https://northflank.com)
- ✅ GitHub account connected to Northflank
- ✅ Payment method added (required for free tier)
- ✅ Code pushed to GitHub

---

## Architecture on Northflank

```
┌─────────────────────────────────────────────────────────┐
│              Northflank Project: bmi-ums                │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PocketBase  │  │  Backend API │  │   Frontend   │
│   (512MB)    │  │   (512MB)    │  │   (512MB)    │
│              │  │              │  │              │
│  SQLite DB   │  │  Hono.js     │  │  React +     │
│  Port 8090   │  │  Port 3001   │  │  Caddy       │
│              │  │              │  │  Port 8080   │
│  + Volume    │  │              │  │              │
│  (5GB)       │  │              │  │  (Public)    │
└──────────────┘  └──────────────┘  └──────────────┘
   Internal          Internal          HTTPS
```

---

## Step 1: Create Northflank Project

1. **Log in to Northflank:** https://app.northflank.com
2. **Create New Project:**
   - Click "Create Project"
   - Name: `bmi-ums`
   - Region: `us-east-1` (or closest to your users)
   - Click "Create"

---

## Step 2: Deploy PocketBase (Database)

### 2.1 Create Service

1. In your `bmi-ums` project, click **"Create Service"**
2. Select **"Combined Service"** (runs continuously)
3. **Source:**
   - Select "GitHub"
   - Repository: `KIAI-JOSEPH/BMI-PORTAL`
   - Branch: `main`
   - Build context: `/` (root)

### 2.2 Configure Build

- **Dockerfile path:** Leave empty (will use Docker image)
- **Docker image:** `ghcr.io/muchobien/pocketbase:0.22.1`
- **Build arguments:** None needed

### 2.3 Configure Service

- **Service name:** `pocketbase`
- **Port:** `8090`
- **Internal only:** ✅ Enable (not publicly accessible)

### 2.4 Configure Resources

- **Plan:** `nf-compute-20` (0.2 vCPU, 512MB RAM)
- **Replicas:** `1`

### 2.5 Add Persistent Storage

1. Click **"Add Volume"**
2. **Mount path:** `/pb_data`
3. **Size:** `5GB`
4. **Name:** `pb-data`

### 2.6 Environment Variables

Add these environment variables:

| Key | Value | Secret |
|-----|-------|--------|
| `PB_ENCRYPTION_KEY` | (generate with: `openssl rand -hex 32`) | ✅ Yes |
| `POCKETBASE_ADMIN_EMAIL` | `admin@bmi.edu` | ❌ No |
| `POCKETBASE_ADMIN_PASSWORD` | (strong password) | ✅ Yes |

### 2.7 Health Check

- **Path:** `/api/health`
- **Port:** `8090`
- **Initial delay:** `10s`
- **Period:** `30s`

### 2.8 Deploy

Click **"Create Service"** and wait for deployment to complete (~2-3 minutes).

---

## Step 3: Deploy Backend API

### 3.1 Create Service

1. Click **"Create Service"**
2. Select **"Combined Service"**
3. **Source:**
   - Repository: `KIAI-JOSEPH/BMI-PORTAL`
   - Branch: `main`
   - Build context: `/backend`

### 3.2 Configure Build

- **Dockerfile path:** `Dockerfile`
- **Build context:** `/backend`

### 3.3 Configure Service

- **Service name:** `api`
- **Port:** `3001`
- **Internal only:** ✅ Enable

### 3.4 Configure Resources

- **Plan:** `nf-compute-20` (0.2 vCPU, 512MB RAM)
- **Replicas:** `1`

### 3.5 Environment Variables

Add these environment variables:

| Key | Value | Secret |
|-----|-------|--------|
| `NODE_ENV` | `production` | ❌ No |
| `PORT` | `3001` | ❌ No |
| `JWT_SECRET` | (generate with: `openssl rand -hex 32`) | ✅ Yes |
| `ENCRYPTION_KEY` | (generate with: `openssl rand -hex 32`) | ✅ Yes |
| `CERT_SIGNING_SECRET` | (generate with: `openssl rand -hex 32`) | ✅ Yes |
| `CERT_OFFLINE_SECRET` | (generate with: `openssl rand -hex 32`) | ✅ Yes |
| `POCKETBASE_URL` | `http://pocketbase:8090` | ❌ No |
| `CORS_ORIGIN` | `https://frontend-<your-id>.northflank.app` | ❌ No |
| `VERIFY_PORTAL_URL` | `https://frontend-<your-id>.northflank.app` | ❌ No |

**Note:** You'll update `CORS_ORIGIN` and `VERIFY_PORTAL_URL` after deploying the frontend.

### 3.6 Health Check

- **Path:** `/health`
- **Port:** `3001`
- **Initial delay:** `10s`
- **Period:** `30s`

### 3.7 Deploy

Click **"Create Service"** and wait for deployment.

---

## Step 4: Deploy Frontend

### 4.1 Create Service

1. Click **"Create Service"**
2. Select **"Combined Service"**
3. **Source:**
   - Repository: `KIAI-JOSEPH/BMI-PORTAL`
   - Branch: `main`
   - Build context: `/` (root)

### 4.2 Configure Build

- **Dockerfile path:** `Dockerfile.frontend.flyio`
- **Build arguments:**
  - `VITE_VERIFY_URL`: `https://frontend-<your-id>.northflank.app` (you'll get this after creation)

### 4.3 Configure Service

- **Service name:** `frontend`
- **Port:** `8080`
- **Public access:** ✅ Enable (this is your public URL)

### 4.4 Configure Resources

- **Plan:** `nf-compute-20` (0.2 vCPU, 512MB RAM)
- **Replicas:** `1`

### 4.5 Environment Variables

Add these environment variables:

| Key | Value | Secret |
|-----|-------|--------|
| `VITE_API_URL` | `/api` | ❌ No |
| `VITE_POCKETBASE_URL` | `/pb` | ❌ No |
| `VITE_VERIFY_URL` | `https://frontend-<your-id>.northflank.app` | ❌ No |

### 4.6 Health Check

- **Path:** `/`
- **Port:** `8080`
- **Initial delay:** `10s`
- **Period:** `30s`

### 4.7 Deploy

Click **"Create Service"** and wait for deployment.

---

## Step 5: Update Backend Environment Variables

After the frontend is deployed, you'll get a public URL like:
`https://frontend-abc123.northflank.app`

1. Go to **Backend API service**
2. Click **"Environment"**
3. Update these variables:
   - `CORS_ORIGIN`: `https://frontend-abc123.northflank.app`
   - `VERIFY_PORTAL_URL`: `https://frontend-abc123.northflank.app`
4. Click **"Save"**
5. Service will automatically restart

---

## Step 6: Initialize Database

### 6.1 Access PocketBase Admin

Since PocketBase is internal-only, you need to create a tunnel:

1. Go to **PocketBase service**
2. Click **"Port Forwarding"**
3. Forward port `8090` to your local machine
4. Open: `http://localhost:8090/_/`
5. Login with your admin credentials

### 6.2 Create Collections

Run the collection creation script:

```bash
# From your local machine
node scripts/create-transcript-collections.cjs
```

Or manually create collections via PocketBase admin UI.

### 6.3 Create Admin User

1. In PocketBase admin, go to **Users** collection
2. Create a new user with admin role
3. Set email and password
4. Save

---

## Step 7: Test Deployment

### 7.1 Access Frontend

Open your frontend URL: `https://frontend-abc123.northflank.app`

### 7.2 Test Login

1. Try logging in with your admin credentials
2. Verify authentication works

### 7.3 Test Student Management

1. Create a test student
2. Verify data persists
3. Generate a test transcript
4. Verify QR code uses correct domain

### 7.4 Test QR Code

1. Scan QR code with phone
2. Verify verification page loads
3. Verify student data displays correctly

---

## Cost Monitoring

### Check Usage

1. Go to **Settings → Billing**
2. View current month usage
3. Monitor credits remaining

### Expected Costs

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| PocketBase | nf-compute-20 | ~$5 |
| Backend API | nf-compute-20 | ~$5 |
| Frontend | nf-compute-20 | ~$5 |
| **Total** | | **~$15/month** |

**Free credits:** $20/month ✅  
**Your cost:** $0/month (within free tier)

---

## Troubleshooting

### Service Won't Start

1. Check **Logs** tab for errors
2. Verify environment variables are set
3. Check Dockerfile builds locally: `docker build -t test ./backend`

### Database Connection Failed

1. Verify PocketBase service is running
2. Check `POCKETBASE_URL` is `http://pocketbase:8090`
3. Verify internal networking is enabled

### Frontend Can't Reach Backend

1. Verify `CORS_ORIGIN` matches frontend URL
2. Check Caddyfile.flyio reverse proxy configuration
3. Verify backend service is running

### Out of Credits

1. Check billing dashboard
2. Optimize resource usage (reduce replicas)
3. Consider upgrading to paid plan

---

## Backup Procedures

### Manual Backup

1. Go to **PocketBase service**
2. Click **"Port Forwarding"**
3. Forward port `8090`
4. Run backup script:

```bash
# SSH into service or use port forwarding
sqlite3 /pb_data/data.db .dump > backup.sql
```

### Automated Backups

Northflank doesn't have built-in backup automation. Consider:
1. Setting up a cron job on your local machine
2. Using Litestream for continuous replication
3. Periodic manual backups

---

## Scaling

### Vertical Scaling

Upgrade to larger plans:
- `nf-compute-50`: 0.5 vCPU, 1GB RAM (~$12/month)
- `nf-compute-100`: 1 vCPU, 2GB RAM (~$24/month)

### Horizontal Scaling

Increase replicas:
- PocketBase: Keep at 1 (SQLite limitation)
- Backend API: Scale to 2-3 replicas
- Frontend: Scale to 2-3 replicas

---

## Next Steps

1. ✅ Deploy all three services
2. ✅ Test end-to-end functionality
3. ✅ Generate test transcripts
4. ✅ Verify QR codes work
5. ⏳ Set up automated backups
6. ⏳ Configure custom domain (optional)
7. ⏳ Monitor usage and costs

---

## Support

- **Northflank Docs:** https://northflank.com/docs
- **Northflank Community:** https://discord.gg/northflank
- **BMI UMS Issues:** https://github.com/KIAI-JOSEPH/BMI-PORTAL/issues

---

**Your deployment is ready! 🎉**

Access your system at: `https://frontend-<your-id>.northflank.app`
