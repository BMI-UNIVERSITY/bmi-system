# Production Deployment Guide

## Caddyfile Configuration

For local development, the repository uses `Caddyfile.dev` (usually copied to `Caddyfile`) to serve traffic over HTTP with `auto_https off`.

When deploying to production, you must swap the `Caddyfile` to use `Caddyfile.prod` which is configured for secure HTTPS traffic, automatic TLS certificates, and proper security headers.

### Steps to deploy:

1. Copy the production Caddyfile over the default one:
   ```bash
   cp Caddyfile.prod Caddyfile
   ```

2. Open the new `Caddyfile` and ensure that the domain name matches your production domain (e.g., `bmi.university.edu`). Do not set `auto_https off` in production.

3. Ensure that your `.env` file contains all necessary production secrets, including:
   - `LITESTREAM_S3_BUCKET` for database replication
   - JWT secrets
   - `NODE_ENV=production`

4. Start or restart the Caddy service:
   ```bash
   docker compose up -d --build
   ```

## Admin Access

The PocketBase Admin UI (`/_/`) is blocked externally by default in the production Caddyfile for security. To access it, you must use an SSH tunnel to the host machine and access it via `localhost:8090`.
