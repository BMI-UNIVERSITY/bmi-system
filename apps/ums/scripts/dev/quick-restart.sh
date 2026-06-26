#!/bin/bash

echo "🔄 Quick restart..."

# Kill everything
pkill -9 node 2>/dev/null || true
pkill -9 tsx 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

sleep 2

# Start backend
cd /home/nissi/bmi-ums/backend
npm run dev
