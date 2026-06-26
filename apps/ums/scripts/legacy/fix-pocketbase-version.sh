#!/bin/bash

echo "🔧 Fixing PocketBase SDK version mismatch..."
echo ""
echo "Current situation:"
echo "  - PocketBase Server: 0.22.20"
echo "  - PocketBase SDK: 0.25.0 (incompatible)"
echo ""
echo "Solution: Downgrading SDK to 0.22.0"
echo ""

cd /home/nissi/bmi-ums/backend

echo "📦 Installing PocketBase SDK 0.22.0..."
npm install pocketbase@0.22.0

echo ""
echo "✅ Done! Now you can run: ./run-add-mock-students.sh"
