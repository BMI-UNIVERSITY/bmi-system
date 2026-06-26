#!/bin/bash

echo "🔍 Checking all BMI UMS services..."
echo "===================================="
echo ""

# Check PocketBase
echo "1. PocketBase (port 8090):"
if curl -s http://localhost:8090/api/health > /dev/null 2>&1; then
    echo "   ✅ Running"
else
    echo "   ❌ Not responding"
fi

# Check Backend API
echo ""
echo "2. Backend API (port 3001):"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Running"
else
    echo "   ❌ Not responding"
fi

# Check Frontend
echo ""
echo "3. Frontend (port 3000):"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Running"
else
    echo "   ❌ Not responding"
fi

echo ""
echo "===================================="
echo ""
echo "📋 Process check:"
ps aux | grep -E "pocketbase|node|vite" | grep -v grep

echo ""
echo "===================================="
echo ""
echo "To start services:"
echo "  PocketBase: ./bin/pocketbase serve"
echo "  Backend: cd backend && npm run dev"
echo "  Frontend: npm run dev"
