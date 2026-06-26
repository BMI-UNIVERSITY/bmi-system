# BMI UMS - Makefile for common development tasks

.PHONY: help install start stop restart dev start-windows docker-up docker-down migrate test test-all typecheck type-check lint lint-all clean logs seed status preflight verify

# Default target
help:
	@echo "BMI University Management System - Available Commands"
	@echo "======================================================"
	@echo "make install      - Install all dependencies"
	@echo "make start        - Start full dev stack (PocketBase, Ollama, API, Frontend)"
	@echo "make stop         - Stop all services"
	@echo "make dev          - Start development mode with hot reload"
	@echo "make docker-up    - Start with Docker Compose"
	@echo "make docker-down  - Stop Docker Compose"
	@echo "make migrate      - Show PocketBase schema bootstrap instructions"
	@echo "make test         - Run tests"
	@echo "make lint         - Run linter"
	@echo "make verify       - Run backend test/lint/build + frontend build"
	@echo "make clean        - Clean build artifacts and logs"
	@echo "make logs         - View all logs"
	@echo "make status       - Check service status"

# Install dependencies
install:
	@echo "Installing dependencies..."
	cd backend && npm install
	@echo "Dependencies installed!"

# Start all services
start:
	@echo "Starting full development stack..."
	./start-dev.sh

# Stop all services
stop:
	@echo "Stopping all services..."
	./scripts/stop-all.sh

# Development mode
dev:
	@echo "Starting development stack..."
	./scripts/dev/start-dev.sh || bash start-all.sh

# Windows: start all services in the background (PowerShell)
start-windows:
	@echo "Starting background services (Windows)..."
	powershell -ExecutionPolicy Bypass -File scripts/windows/start-background.ps1

# Backend development
dev-backend:
	@echo "Starting backend development server..."
	cd backend && npm run dev

# Frontend development
dev-frontend:
	@echo "Starting frontend development server..."
	npm run dev

# Docker Compose
docker-up:
	@echo "Starting with Docker Compose..."
	docker-compose up -d
	@echo "Services starting..."
	@echo "API will be available at: http://localhost:3001"
	@echo "PocketBase at: http://localhost:8090"

docker-down:
	@echo "Stopping Docker Compose..."
	docker-compose down

docker-logs:
	@echo "Viewing Docker logs..."
	docker-compose logs -f

# PocketBase schema is applied by the API on startup (pocketbase.ts setupCollections).
migrate:
	@echo "PocketBase schema: created by backend on startup (src/services/pocketbase.ts)."
	@echo "  1. Start PocketBase  2. cd backend && npm run dev"
	@echo "Docs: docs/SCHEMA_SETUP.md"
	@echo "Legacy migrate-db.ts: set ALLOW_LEGACY_POCKETBASE_MIGRATE=1 (not recommended)."

# Create first admin user
create-admin:
	@echo "Creating admin user..."
	cd backend && npx tsx ../scripts/create-admin.ts

# Run all tests (frontend + backend)
test:
	@echo "Running frontend tests..."
	npm test
	@echo "Running backend tests..."
	cd backend && npm test

preflight: 
	@bash scripts/preflight-check.sh 

test-all: 
	@npm run test && cd backend && npm test 

lint-all: 
	@npm run lint && cd backend && npm run lint 

verify: 
	@echo "Running full verification..." 
	@npm run type-check 
	@npm run lint 
	@npm run test 
	@npm run build 
	@cd backend && npm run lint && npm test && npm run build 
	@echo "All checks passed." 
restart:
	@echo "Restarting backend API..."
	./scripts/dev/restart-backend.sh || pkill -f 'node.*backend' || true
	cd backend && npm run dev &
	@echo "Backend restarting..."

# Seed development data
seed:
	@echo "Seeding development data..."
	cd backend && npx tsx scripts/seed-courses.ts || true
	cd backend && npx tsx scripts/seed-real-data.ts || true

# Linting
lint:
	@echo "Running linter..."
	npm run lint

lint-all:
	@echo "Running all linters..."
	npm run lint
	cd backend && npm run lint
	@echo "All lint checks passed."

# Full local verification
verify:
	@echo "Running full verification..."
	cd backend && npm test -- --run && npm run lint && npm run build
	npm run build

# Clean
clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/dist
	rm -rf backend/node_modules
	rm -rf logs/*.log
	rm -f logs/*.pid
	docker-compose down -v
	docker system prune -f
	@echo "Clean complete!"

# View logs
logs:
	@echo "Viewing logs (Ctrl+C to exit)..."
	tail -f logs/*.log

# Check service status
status:
	@echo "Checking service status..."
	@echo "PocketBase (8090): $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8090/api/health 2>/dev/null || echo 'DOWN')"
	@echo "Ollama (11434): $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:11434/api/tags 2>/dev/null || echo 'DOWN')"
	@echo "API (3001): $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health 2>/dev/null || echo 'DOWN')"

# Setup (first time)
setup:
	@echo "Setting up BMI UMS for the first time..."
	@echo "1. Installing dependencies..."
	cd backend && npm install
	@echo "2. Creating environment file..."
	cd backend && cp .env.example .env
	@echo "3. Downloading PocketBase..."
	mkdir -p bin
	curl -L -o /tmp/pb.zip https://github.com/pocketbase/pocketbase/releases/download/v0.37.4/pocketbase_0.37.4_linux_amd64.zip
	@echo "Verifying PocketBase download checksum..."
	@echo "e6cb338e54329e328e4f42b999ac820901d2d23b7e7562417259b0ef882edf9c  /tmp/pb.zip" | sha256sum -c -
	unzip -o /tmp/pb.zip -d bin/
	rm /tmp/pb.zip
	chmod +x bin/pocketbase
	@echo "4. Installing Ollama (if not installed)..."
	which ollama || curl -fsSL https://ollama.com/install.sh | sh
	@echo "Setup complete! Edit backend/.env with your settings, then run 'make start'"

# Pre-flight environment check
preflight:
	@echo "Running pre-flight environment checks..."
	@bash scripts/preflight-check.sh

# Run all tests (alias with clearer name)
test-all:
	@echo "Running all tests (frontend + backend)..."
	npm run test
	cd backend && npm test
	@echo "All tests passed."

# Full verification gate (run before any PR/push)
verify:
	@echo "Running full verification..."
	npm run type-check
	npm run lint
	npm run test
	npm run build
	cd backend && npm run lint && npm test && npm run build
	@echo "All checks passed. Ready to push."
