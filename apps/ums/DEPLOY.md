# BMI UMS - Cloudflare Pages Deployment Config
# This file tells Cloudflare Pages how to build and deploy the UMS frontend.
#
# In Cloudflare Dashboard > Pages > bmi-ums > Settings > Build:
#   - Build command:      npm run build
#   - Build output dir:   dist
#   - Root directory:     apps/ums
#
# ─── REQUIRED Environment Variables ────────────────────────────────────────────
# Set these in Cloudflare Dashboard → Pages → bmi-ums → Settings →
# Environment variables. Each is a build-time variable (must be present when
# `npm run build` runs) — Vite inlines them into the static bundle.
#
#   VITE_API_URL = https://bmi-api.bmiuniversity107.workers.dev
#
# ⚠️  Why this matters
# `src/services/config.ts` falls back to the production URL when this is
# missing, but Cloudflare Pages' static `public/_redirects` proxy is
# unreliable for CORS preflights. If `VITE_API_URL` is empty the browser
# sends POSTs to the Pages origin, the preflight fails, and login shows
# "Unable to reach the authentication server". Always set it explicitly.
