#!/bin/bash

# Setup PocketBase Admin User
# This script creates an admin user in PocketBase

echo "🔧 Setting up PocketBase Admin..."
echo ""

# Configuration
ADMIN_EMAIL="admin@bmi.edu"
ADMIN_PASSWORD="BMIAdmin2024Secure"

# Navigate to bin directory where PocketBase is located
cd bin

echo "📧 Creating admin with email: $ADMIN_EMAIL"
echo ""

# Create superuser using PocketBase CLI
./pocketbase superuser create "$ADMIN_EMAIL" "$ADMIN_PASSWORD"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Admin user created successfully!"
    echo ""
    echo "📋 Credentials:"
    echo "   Email: $ADMIN_EMAIL"
    echo "   Password: $ADMIN_PASSWORD"
    echo ""
    echo "🌐 You can now:"
    echo "   1. Access PocketBase Admin: http://localhost:8090/_/"
    echo "   2. Restart the backend: cd backend && npm run dev"
else
    echo ""
    echo "❌ Failed to create admin user"
    echo "   The user might already exist"
fi
