#!/bin/bash

# BMI UMS - Stop Development Services Script

echo "🛑 Stopping BMI UMS Development Services"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to stop service by PID file
stop_service() {
    local service=$1
    local pidfile="logs/${service}.pid"
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if ps -p $pid > /dev/null 2>&1; then
            echo -n "Stopping $service (PID: $pid)..."
            kill $pid 2>/dev/null
            sleep 1
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid 2>/dev/null
            fi
            rm "$pidfile"
            echo -e " ${GREEN}✓${NC}"
        else
            echo -e "${YELLOW}⚠${NC} $service not running (stale PID file)"
            rm "$pidfile"
        fi
    else
        echo -e "${YELLOW}⚠${NC} $service PID file not found"
    fi
}

# Function to stop service by port
stop_by_port() {
    local port=$1
    local service=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -n "Stopping $service on port $port (PID: $pid)..."
        kill $pid 2>/dev/null
        sleep 1
        if ps -p $pid > /dev/null 2>&1; then
            kill -9 $pid 2>/dev/null
        fi
        echo -e " ${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠${NC} No process found on port $port"
    fi
}

# Stop services
stop_service "frontend"
stop_service "backend"
stop_service "ollama"
stop_service "pocketbase"

echo ""
echo "Checking for any remaining processes..."
echo ""

# Double-check by port
stop_by_port 3000 "Frontend"
stop_by_port 3001 "Backend"
stop_by_port 11434 "Ollama"
stop_by_port 8090 "PocketBase"

echo ""
echo -e "${GREEN}✓ All services stopped${NC}"
echo ""
echo "To start services again, run: make start"
