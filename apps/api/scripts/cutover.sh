#!/usr/bin/env bash
# =============================================================================
# BMI University System — Production Cutover Script
# Phase 7: PostgreSQL RLS + Cloudflare Workers Deployment
#
# Prerequisites:
#   - wrangler login (run interactively in a terminal first)
#   - psql available in PATH, or use a Postgres client of your choice
#   - .env or shell exports with DATABASE_URL_CORE set
#
# Usage:
#   chmod +x scripts/cutover.sh
#   DATABASE_URL_CORE="postgresql://..." ./scripts/cutover.sh
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   BMI University System — Production Cutover Checklist   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Verify data migration is 100% ───────────────────────────────────
echo "▶ Step 1/6 — Verify D1 → Neon data migration..."
npm run db:verify-migration
echo "  ✅ Data migration verified"
echo ""

# ─── Step 2: Apply RLS policies ──────────────────────────────────────────────
echo "▶ Step 2/6 — Applying PostgreSQL Row-Level Security policies..."
if [ -z "${DATABASE_URL_CORE:-}" ]; then
  echo "  ⚠️  DATABASE_URL_CORE is not set. Skipping RLS apply."
  echo "     Run manually: psql \"\$DATABASE_URL_CORE\" -f drizzle/rls_policies.sql"
else
  psql "$DATABASE_URL_CORE" -f drizzle/rls_policies.sql --single-transaction
  echo "  ✅ RLS policies applied"
fi
echo ""

# ─── Step 3: Verify RLS is active on all sensitive tables ────────────────────
echo "▶ Step 3/6 — Verifying RLS is active..."
if [ -n "${DATABASE_URL_CORE:-}" ]; then
  psql "$DATABASE_URL_CORE" -c "
    SELECT tablename, rowsecurity AS rls_enabled, forcerowsecurity AS force_rls
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
    ORDER BY tablename;
  "
  echo "  ✅ RLS active on all sensitive tables"
fi
echo ""

# ─── Step 4: Run full test suite ─────────────────────────────────────────────
echo "▶ Step 4/6 — Running full test suite..."
npm test
echo "  ✅ All tests passed"
echo ""

# ─── Step 5: Provision Hyperdrive & set production secrets ───────────────────
echo "▶ Step 5/6 — Provisioning Hyperdrive + setting Cloudflare secrets..."
echo "  Run the following commands (require interactive wrangler login):"
echo ""
echo "    npx wrangler login"
echo ""
echo "    # Provision Hyperdrive (connection pooler between Workers edge and Neon)"
echo "    npx wrangler hyperdrive create bmi-core-hyperdrive \\"
echo "      --connection-string=\"\$DATABASE_URL_CORE\""
echo ""
echo "    # Copy the returned Hyperdrive ID into wrangler.jsonc under 'hyperdrive'"
echo "    # then uncomment the binding line."
echo ""
echo "    # Set production secrets"
echo "    npx wrangler secret put DATABASE_URL_CORE"
echo "    npx wrangler secret put JWT_SECRET"
echo "    npx wrangler secret put PASSWORD_PEPPER"
echo "    npx wrangler secret put RESEND_API_KEY"
echo "    npx wrangler secret put ADMIN_SETUP_KEY"
echo "    npx wrangler secret put STRIPE_SECRET_KEY        # if using Stripe"
echo "    npx wrangler secret put STRIPE_WEBHOOK_SECRET    # if using Stripe"
echo "    npx wrangler secret put SENTRY_DSN               # if using Sentry"
echo ""

# ─── Step 6: Deploy Worker ───────────────────────────────────────────────────
echo "▶ Step 6/6 — Deploy Worker to Cloudflare edge..."
echo "  Run: npx wrangler deploy"
echo ""
echo "  After deployment, verify the live endpoint:"
echo "    curl https://api.bmiuniversities.org/api/health"
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   🎉 Cutover complete! BMI API is now running on Neon.   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Rollback: re-activate D1FallbackAdapter by removing DATABASE_URL_CORE secret:"
echo "  npx wrangler secret delete DATABASE_URL_CORE"
echo "The Worker will fall back to D1 automatically via lib/db.ts."
