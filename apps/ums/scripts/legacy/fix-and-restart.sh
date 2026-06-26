#!/bin/bash

echo "🔧 BMI UMS Backend Fix & Restart"
echo "================================"
echo ""

# Navigate to backend
cd /home/nissi/bmi-ums/backend

# Kill all node/tsx processes
echo "1️⃣ Stopping all Node processes..."
pkill -9 node 2>/dev/null || true
pkill -9 tsx 2>/dev/null || true

# Kill process on port 3001
echo "   Killing process on port 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

sleep 3
echo "✅ Processes stopped"
echo ""

# Clear cache
echo "2️⃣ Clearing cache..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .tsx 2>/dev/null || true
echo "✅ Cache cleared"
echo ""

# Verify the fix is in place
echo "3️⃣ Verifying code fix..."
if grep -q "api/admins/auth-with-password" src/services/pocketbase.ts; then
    echo "✅ Code fix verified - using direct HTTP call to /api/admins/auth-with-password"
else
    echo "❌ Code fix NOT found!"
    exit 1
fi
echo ""

# Start backend
echo "4️⃣ Starting backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run dev
