#!/bin/bash

# Kill any existing backend processes
pkill -f "tsx watch src/index.ts" 2>/dev/null || true

# Wait a moment
sleep 2

# Navigate to backend directory
cd /home/nissi/bmi-ums/backend

# Start the backend
npm run dev
