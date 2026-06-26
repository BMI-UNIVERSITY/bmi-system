#!/bin/bash

echo "🔄 Force restarting backend..."

# Kill ALL node/tsx processes
pkill -9 node 2>/dev/null || true
pkill -9 tsx 2>/dev/null || true

# Wait
sleep 3

# Clear any npm cache
cd /home/nissi/bmi-ums/backend
rm -rf node_modules/.cache 2>/dev/null || true

# Start fresh
echo "🚀 Starting backend..."
npm run dev
