# BMI UMS - Cloudflare Pages Deployment Config
# This file tells Cloudflare Pages how to build and deploy the UMS frontend.
#
# In Cloudflare Dashboard > Pages > bmi-ums > Settings > Build:
#   - Build command:      npm run build
#   - Build output dir:   dist
#   - Root directory:     apps/ums
#
# Environment Variables (set in Cloudflare Dashboard, NOT here):
#   VITE_API_URL = https://api.bmi.ac.ke    (or your worker URL)
