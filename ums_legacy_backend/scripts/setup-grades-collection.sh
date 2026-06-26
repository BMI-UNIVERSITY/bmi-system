#!/bin/bash

# Setup grades collection in PocketBase
# This script creates the admin user if needed, then creates the grades collection

echo "🔧 Setting up grades collection in PocketBase..."
echo ""

PB_URL="http://127.0.0.1:8090"
ADMIN_EMAIL="admin@bmi.edu"
ADMIN_PASSWORD="${POCKETBASE_ADMIN_PASSWORD:-<your-admin-password>}"

# Check if PocketBase is running
if ! curl -s "$PB_URL/api/health" > /dev/null 2>&1; then
    echo "❌ PocketBase is not running on port 8090"
    echo "   Please start it first: make start"
    exit 1
fi

echo "✓ PocketBase is running"
echo ""

# Create the grades collection using PocketBase API
echo "📝 Creating grades collection..."

# First, try to authenticate
AUTH_RESPONSE=$(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

# Check if authentication was successful
if echo "$AUTH_RESPONSE" | grep -q "token"; then
    echo "✓ Admin authenticated"
    TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo "⚠️  Admin user doesn't exist, creating it..."
    
    # Create admin user using PocketBase CLI
    cd ../bin
    ./pocketbase superuser create "$ADMIN_EMAIL" "$ADMIN_PASSWORD" --dir=./pb_data
    cd ../backend
    
    # Try authentication again
    AUTH_RESPONSE=$(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
      -H "Content-Type: application/json" \
      -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    
    TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo "❌ Failed to authenticate admin"
        exit 1
    fi
    
    echo "✓ Admin user created and authenticated"
fi

echo ""

# Check if grades collection already exists
COLLECTIONS=$(curl -s -X GET "$PB_URL/api/collections" \
  -H "Authorization: $TOKEN")

if echo "$COLLECTIONS" | grep -q '"name":"grades"'; then
    echo "⚠️  Grades collection already exists"
    echo ""
    echo "✅ Setup complete!"
    exit 0
fi

# Create grades collection
echo "Creating grades collection..."

COLLECTION_DATA='{
  "name": "grades",
  "type": "base",
  "schema": [
    {"name": "studentId", "type": "text", "required": true},
    {"name": "studentName", "type": "text", "required": true},
    {"name": "admissionNo", "type": "text", "required": true},
    {"name": "courseCode", "type": "text", "required": true},
    {"name": "courseName", "type": "text", "required": true},
    {"name": "grade", "type": "number", "required": true},
    {"name": "letterGrade", "type": "text", "required": true},
    {"name": "gpa", "type": "number", "required": true},
    {"name": "total", "type": "number", "required": true},
    {"name": "midterm", "type": "number"},
    {"name": "final", "type": "number"},
    {"name": "academicYear", "type": "text"},
    {"name": "semester", "type": "text"},
    {"name": "status", "type": "select", "required": true, "options": {"maxSelect": 1, "values": ["Pending Review", "Verified", "Flagged"]}},
    {"name": "createdAt", "type": "text", "required": true},
    {"name": "updatedAt", "type": "text", "required": true}
  ]
}'

CREATE_RESPONSE=$(curl -s -X POST "$PB_URL/api/collections" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$COLLECTION_DATA")

if echo "$CREATE_RESPONSE" | grep -q '"name":"grades"'; then
    echo "✅ Grades collection created successfully!"
    echo ""
    echo "You can now:"
    echo "  - Add grades through the UI at http://localhost:3000"
    echo "  - View grades in PocketBase Admin: http://localhost:8090/_/"
    echo ""
else
    echo "❌ Failed to create grades collection"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi
