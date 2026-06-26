#!/bin/bash

# BMI UMS - Service Health Check Script
# This script checks if all required services are running

set -e

echo "🔍 BMI UMS - Service Health Check"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}✓${NC} $service (port $port) - ${GREEN}RUNNING${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} $service (port $port) - ${RED}NOT RUNNING${NC}"
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local service=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404" ; then
        echo -e "${GREEN}✓${NC} $service - ${GREEN}RESPONDING${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} $service - ${RED}NOT RESPONDING${NC}"
        return 1
    fi
}

# Track overall status
all_services_running=true

echo "📡 Checking Services..."
echo ""

# Check PocketBase (port 8090)
if check_port 8090 "PocketBase"; then
    check_http "http://localhost:8090/api/health" "  PocketBase API"
else
    all_services_running=false
fi
echo ""

# Check Ollama (port 11434)
if check_port 11434 "Ollama"; then
    check_http "http://localhost:11434/api/tags" "  Ollama API"
else
    all_services_running=false
fi
echo ""

# Check Backend API (port 3001)
if check_port 3001 "Backend API"; then
    check_http "http://localhost:3001/health" "  Backend Health"
else
    all_services_running=false
fi
echo ""

# Check Frontend Dev Server (port 3000)
if check_port 3000 "Frontend"; then
    check_http "http://localhost:3000" "  Frontend"
else
    echo -e "${YELLOW}⚠${NC} Frontend (port 3000) - ${YELLOW}NOT RUNNING${NC}"
    echo "  (This is OK if you haven't started the dev server yet)"
fi
echo ""

# Check Node.js version
echo "🔧 Environment Check..."
echo ""
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js - $node_version"
else
    echo -e "${RED}✗${NC} Node.js - NOT INSTALLED"
    all_services_running=false
fi

# Check npm
if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    echo -e "${GREEN}✓${NC} npm - v$npm_version"
else
    echo -e "${RED}✗${NC} npm - NOT INSTALLED"
    all_services_running=false
fi

# Check if backend dependencies are installed
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Backend dependencies - INSTALLED"
else
    echo -e "${RED}✗${NC} Backend dependencies - NOT INSTALLED"
    echo "  Run: cd backend && npm install"
    all_services_running=false
fi

# Check if frontend dependencies are installed
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Frontend dependencies - INSTALLED"
else
    echo -e "${RED}✗${NC} Frontend dependencies - NOT INSTALLED"
    echo "  Run: npm install"
    all_services_running=false
fi

echo ""
echo "=================================="

# Final status
if [ "$all_services_running" = true ]; then
    echo -e "${GREEN}✓ All critical services are running!${NC}"
    echo ""
    echo "🌐 Access URLs:"
    echo "  Frontend:   http://localhost:3000"
    echo "  Backend API: http://localhost:3001"
    echo "  PocketBase:  http://localhost:8090"
    echo "  PocketBase Admin: http://localhost:8090/_/"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some services are not running${NC}"
    echo ""
    echo "📋 To start services:"
    echo "  1. Start PocketBase: ./bin/pocketbase serve"
    echo "  2. Start Ollama: ollama serve"
    echo "  3. Start Backend: cd backend && npm run dev"
    echo "  4. Start Frontend: npm run dev"
    echo ""
    echo "Or use: make start (to start all services)"
    echo ""
    exit 1
fi
