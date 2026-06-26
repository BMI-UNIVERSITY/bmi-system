#!/bin/bash

# BMI UMS - Development Environment Startup Script
# This script starts all services in the correct order

set -e

echo "🚀 Starting BMI UMS Development Environment"
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to check if a port is in use
port_in_use() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=0
    
    echo -n "  Waiting for $service to be ready"
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404" ; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗ Timeout${NC}"
    return 1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm v$(npm --version)"

# Check if dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}⚠${NC} Backend dependencies not installed"
    echo "  Installing backend dependencies..."
    cd backend && npm install && cd ..
fi
echo -e "${GREEN}✓${NC} Backend dependencies installed"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠${NC} Frontend dependencies not installed"
    echo "  Installing frontend dependencies..."
    npm install
fi
echo -e "${GREEN}✓${NC} Frontend dependencies installed"

echo ""
echo "🔧 Starting services..."
echo ""

# 1. Start PocketBase
echo -e "${BLUE}[1/4]${NC} Starting PocketBase..."
if port_in_use 8090; then
    echo -e "  ${YELLOW}⚠${NC} PocketBase already running on port 8090"
else
    if [ ! -f "bin/pocketbase" ]; then
        echo -e "  ${RED}✗${NC} PocketBase binary not found"
        echo "  Run: make setup"
        exit 1
    fi
    nohup ./bin/pocketbase serve --dir=data/pb_data --migrationsDir=pb_migrations --http=127.0.0.1:8090 > logs/pocketbase.log 2>&1 &
    echo $! > logs/pocketbase.pid
    wait_for_service "http://localhost:8090/api/health" "PocketBase"
fi

# 2. Start Ollama
echo -e "${BLUE}[2/4]${NC} Starting Ollama..."
if port_in_use 11434; then
    echo -e "  ${YELLOW}⚠${NC} Ollama already running on port 11434"
else
    if ! command -v ollama &> /dev/null; then
        echo -e "  ${YELLOW}⚠${NC} Ollama not installed (optional for AI features)"
        echo "  Install from: https://ollama.com/download"
    else
        export OLLAMA_MODELS="${OLLAMA_MODELS:-$(pwd)/.ollama/models}"
        mkdir -p "$OLLAMA_MODELS"
        nohup ollama serve > logs/ollama.log 2>&1 &
        echo $! > logs/ollama.pid
        sleep 2
        echo -e "  ${GREEN}✓${NC} Ollama started"
        
        # Pull Llama model if not exists
        if ! ollama list | grep -q "llama3.2"; then
            echo "  Pulling llama3.2 model (this may take a few minutes)..."
            if ! ollama pull llama3.2:latest; then
                echo -e "  ${YELLOW}⚠${NC} Failed to pull llama3.2 model. Continuing without local model."
                echo "  AI endpoints may be limited until model pull succeeds."
            fi
        fi
    fi
fi

# 3. Start Backend API
echo -e "${BLUE}[3/4]${NC} Starting Backend API..."
if port_in_use 3001; then
    echo -e "  ${YELLOW}⚠${NC} Backend API already running on port 3001"
else
    # Check if .env exists
    if [ ! -f "backend/.env" ]; then
        echo -e "  ${YELLOW}⚠${NC} backend/.env not found, copying from .env.example"
        cp backend/.env.example backend/.env
        echo "  ${YELLOW}⚠${NC} Please edit backend/.env with your settings"
    fi
    
    cd backend
    nohup npm run dev > ../logs/backend.log 2>&1 &
    echo $! > ../logs/backend.pid
    cd ..
    wait_for_service "http://localhost:3001/health" "Backend API"
fi

# 4. Start Frontend
echo -e "${BLUE}[4/4]${NC} Starting Frontend..."
if port_in_use 3000; then
    echo -e "  ${YELLOW}⚠${NC} Frontend already running on port 3000"
else
    nohup npm run dev > logs/frontend.log 2>&1 &
    echo $! > logs/frontend.pid
    wait_for_service "http://localhost:3000" "Frontend"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✓ All services started successfully!${NC}"
echo ""
echo "🌐 Access URLs:"
echo "  Frontend:         http://localhost:3000"
echo "  Backend API:      http://localhost:3001"
echo "  PocketBase:       http://localhost:8090"
echo "  PocketBase Admin: http://localhost:8090/_/"
echo ""
echo "📋 Useful commands:"
echo "  View logs:        tail -f logs/*.log"
echo "  Stop services:    make stop"
echo "  Check status:     ./check-services.sh"
echo ""
echo "🎉 Ready to develop!"
