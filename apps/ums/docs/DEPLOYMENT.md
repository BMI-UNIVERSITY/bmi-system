# BMI UMS — Deployment Guide

## Current Setup (Development / Demo)

Run everything with a single command:

```bash
npm run tunnel
```

This automatically:
1. Kills the old ngrok tunnel
2. Reads your `NGROK_DOMAIN` from `.env`
3. Starts an ngrok tunnel on port 4000
4. Updates `VITE_VERIFY_URL` in `.env`
5. Updates `VERIFY_PORTAL_URL` in `backend/.env`
6. Rebuilds the frontend (URL baked into QR codes)
7. Starts the local proxy (port 4000)
8. Prints the live public URL

**Advantage:** Ngrok with a static domain provides a permanent URL, perfectly suitable for printed documents.

---

## Production Setup (Permanent URL)

### Step 1 — Get a server (~$6/month)

| Provider | Plan | Cost | Link |
|----------|------|------|------|
| DigitalOcean | Basic Droplet 1GB | $6/month | digitalocean.com |
| Hetzner | CX22 | €4/month | hetzner.com/cloud |
| Linode | Nanode 1GB | $5/month | linode.com |

Choose **Ubuntu 22.04 LTS**. You get a permanent IP like `143.198.47.22`.

### Step 2 — Point your domain

In your domain registrar (where `bmiuniversity.ac.ke` is managed), add:

```
Type : A
Name : verify
Value: 143.198.47.22   ← your server IP
TTL  : 300
```

Wait 5–30 minutes for DNS to propagate.

### Step 3 — SSH into the server

```bash
ssh root@143.198.47.22
```

### Step 4 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
apt install -y git
```

### Step 5 — Clone the repo

```bash
git clone https://github.com/YOUR_ORG/bmi-ums.git
cd bmi-ums
```

### Step 6 — Configure environment

```bash
# Backend secrets
cp backend/.env.example backend/.env
nano backend/.env
```

Fill in these fields (minimum required):

```env
JWT_SECRET=<run: openssl rand -hex 32>
ENCRYPTION_KEY=<run: openssl rand -hex 32>
CERT_SIGNING_SECRET=<run: openssl rand -hex 32>
CERT_OFFLINE_SECRET=<run: openssl rand -hex 32>
POCKETBASE_ADMIN_EMAIL=admin@bmiuniversity.ac.ke
POCKETBASE_ADMIN_PASSWORD=<strong password>
CORS_ORIGIN=https://verify.bmiuniversity.ac.ke
VERIFY_PORTAL_URL=https://verify.bmiuniversity.ac.ke
```

```bash
# Frontend public URL
echo "VITE_VERIFY_URL=https://verify.bmiuniversity.ac.ke" > .env
```

### Step 7 — Activate production Caddyfile

Edit `Caddyfile`:
1. Remove the line `auto_https off`
2. Comment out the `:80 {` block
3. Uncomment the `verify.bmiuniversity.ac.ke {` block

### Step 8 — Deploy

```bash
docker compose up -d
```

That's it. Caddy automatically obtains a free SSL certificate from Let's Encrypt.

### Step 9 — Create the PocketBase collections

```bash
node scripts/create-transcript-collections.cjs
```

### Verify it works

```bash
curl https://verify.bmiuniversity.ac.ke/api/v1/health
# → {"success":true,...}
```

Open `https://verify.bmiuniversity.ac.ke` in a browser → verification portal loads.

---

## QR Codes after deployment

Every transcript generated after setting `VERIFY_PORTAL_URL=https://verify.bmiuniversity.ac.ke` will produce QR codes that encode:

```
https://verify.bmiuniversity.ac.ke/verify?id=BMI-TRANS-2026-NNNNNN&t=HMAC_TOKEN
```

Anyone anywhere can scan → real student record appears → `confidence: high`.

---

## Updating the deployment

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

The `VERIFY_PORTAL_URL` stays the same — no need to update QR codes on already-printed documents.
