#!/bin/bash

# BMI UMS - Grading System Setup Script
# This script sets up the complete grading system including:
# - Database migrations
# - Default grading scales
# - Test data (optional)

set -e

echo "=========================================="
echo "BMI UMS - Grading System Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PocketBase is running
echo "Checking PocketBase status..."
if ! curl -s http://127.0.0.1:8090/api/health > /dev/null 2>&1; then
    echo -e "${RED}✗ PocketBase is not running${NC}"
    echo "Please start PocketBase first:"
    echo "  cd bin && ./pocketbase serve"
    exit 1
fi
echo -e "${GREEN}✓ PocketBase is running${NC}"
echo ""

# Check if backend is in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Please run this script from the backend directory${NC}"
    echo "  cd backend && ./scripts/setup-grading-system.sh"
    exit 1
fi

# Step 1: Apply migrations
echo "Step 1: Applying database migrations..."
echo "----------------------------------------"
echo "The following collections will be created:"
echo "  - grades (main grade records)"
echo "  - grade_audit_log (audit trail)"
echo "  - grading_scales (scale configurations)"
echo "  - assessment_components (component templates)"
echo "  - grade_appeals (appeal workflow)"
echo "  - grade_deadlines (submission deadlines)"
echo "  - academic_standing (student standing records)"
echo ""

# PocketBase automatically applies migrations on startup
# We just need to restart it or trigger a migration check
echo -e "${YELLOW}Note: PocketBase migrations are applied automatically on server start${NC}"
echo "If migrations haven't been applied yet, please restart PocketBase:"
echo "  1. Stop PocketBase (Ctrl+C)"
echo "  2. Start it again: cd bin && ./pocketbase serve"
echo ""

read -p "Have you restarted PocketBase to apply migrations? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please restart PocketBase and run this script again."
    exit 1
fi

# Step 2: Seed default grading scales
echo ""
echo "Step 2: Seeding default grading scales..."
echo "----------------------------------------"
echo "Creating default grading scales:"
echo "  - US 4.0 Scale (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, F)"
echo "  - ECTS Scale (A, B, C, D, E, F)"
echo "  - Percentage Scale (0-100)"
echo ""

npx tsx scripts/seed-grading-scales.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Grading scales seeded successfully${NC}"
else
    echo -e "${RED}✗ Failed to seed grading scales${NC}"
    exit 1
fi

# Step 3: Verify setup
echo ""
echo "Step 3: Verifying setup..."
echo "----------------------------------------"

# Check if collections exist
echo "Checking collections..."
COLLECTIONS=("grades" "grade_audit_log" "grading_scales" "assessment_components" "grade_appeals" "grade_deadlines" "academic_standing")

for collection in "${COLLECTIONS[@]}"; do
    if curl -s "http://127.0.0.1:8090/api/collections/$collection" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $collection"
    else
        echo -e "${RED}✗${NC} $collection (not found)"
    fi
done

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Start the backend API server:"
echo "     npm run dev"
echo ""
echo "  2. Test the grading API endpoints:"
echo "     curl http://localhost:3000/api/v1/grading-scales"
echo ""
echo "  3. Access the PocketBase admin UI:"
echo "     http://127.0.0.1:8090/_/"
echo ""
echo "API Endpoints available:"
echo "  - POST   /api/v1/grades"
echo "  - GET    /api/v1/grades"
echo "  - GET    /api/v1/grades/:id"
echo "  - PUT    /api/v1/grades/:id"
echo "  - DELETE /api/v1/grades/:id"
echo ""
echo "  - GET    /api/v1/grading-scales"
echo "  - POST   /api/v1/grading-scales"
echo "  - GET    /api/v1/grading-scales/:id"
echo "  - PUT    /api/v1/grading-scales/:id"
echo "  - DELETE /api/v1/grading-scales/:id"
echo ""
echo "  - POST   /api/v1/grade-appeals"
echo "  - GET    /api/v1/grade-appeals"
echo "  - GET    /api/v1/grade-appeals/:id"
echo "  - PUT    /api/v1/grade-appeals/:id"
echo "  - DELETE /api/v1/grade-appeals/:id"
echo ""
echo -e "${GREEN}✓ Grading system is ready to use!${NC}"
