#!/bin/bash

echo "🔄 Restarting backend..."

# Kill any existing backend processes
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
sleep 2

# Navigate to backend directory
cd /home/nissi/bmi-ums/backend

# Start the backend
echo "🚀 Starting backend..."
npm run dev
