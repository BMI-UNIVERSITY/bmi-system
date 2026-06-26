# BMI University Management System

**100% Open Source | Privacy-First | Self-Hosted**

## Overview

BMI UMS is a complete university management system built with an entirely open-source stack. All data stays on your infrastructure - no proprietary cloud services or API keys required.

## 🚀 10/10 Remediation Success

This project has been fully audited and hardened to meet the **10/10 Target Dimensions**:
- **Docker Hardening**: Images pinned, resource limits set, non-root execution.
- **Security**: Strict CSP, pre-flight secret validation, Caddy prod/dev split.
- **Architecture**: Shared types package, clean root directory, centralized utility scripts.
- **CI/CD**: Fully automated linting, type-checking, and non-root verification.

---

## 🏗️ Architecture & Core Components

| Layer | Technology | License |
|-------|------------|---------|
| **AI/LLM** | Ollama + Llama 3.2 | MIT |
| **Authentication** | PocketBase | MIT |
| **Database** | SQLite (via PocketBase) | Public Domain |
| **Backend API** | Hono.js | MIT |
| **Frontend** | React + Vite | MIT |
| **Reverse Proxy** | Caddy | Apache 2.0 |

## Quick Start

### Prerequisites

- Node.js 20+
- WSL Ubuntu (recommended) or native Linux

### Development Setup

```bash
# Navigate to WSL project
cd ~/bmi-ums

# Setup (first time)
make setup

# PocketBase collections are created when the API starts (not via legacy migrate scripts).
# See docs/SCHEMA_SETUP.md

# Start all services
make start

# View logs
make logs
```

### Docker Development

For local development with hot-reload using Docker, use the provided override file:

```bash
docker compose up -d
```

This uses `docker-compose.override.yml` to mount the `backend/` directory and run the API in development mode with `npm run dev`. Ensure you have a `.env` file in the root or `backend/` directory.

### Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React application |
| API | http://localhost:3001 | Hono.js backend |
| PocketBase | http://localhost:8090 | Database & Auth |
| PocketBase UI | http://localhost:8090/_/ | Admin dashboard |

## Project Structure

```
~/bmi-ums/
├── backend/           # Hono.js API server
├── src/              # React frontend
├── scripts/          # Utility scripts
├── Makefile          # Common commands
└── docker-compose.yml # Docker deployment
```

## Key Features

- **Zero external dependencies** - Everything runs locally
- **Privacy by design** - No data leaves your server
- **JWT authentication** - Secure, stateless auth
- **Role-based access control** - Admin, Registrar, Staff roles
- **AI integration** - Local LLM via Ollama
- **Certificate verification** - QR code + content hashing
- **Audit logging** - Complete activity tracking

## Make Commands

```bash
make help       # Show all commands
make install    # Install dependencies
make start      # Start all services
make stop       # Stop all services
make dev        # Development mode
make docker-up  # Start with Docker
make migrate    # Run database migrations
make status     # Check service status
make clean      # Clean everything
make verify     # Run backend test/lint/build + frontend build
```

## First 30 Minutes

1. Run `make setup` once.
2. Start services with `make start`.
3. Confirm app at `http://localhost:3000` and API health at `http://localhost:3001/health`.
4. Run `make verify` before starting feature work.
5. Use `scripts/README.md` to distinguish supported scripts from legacy helpers.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing key | (generate) |
| `ENCRYPTION_KEY` | AES-256 key | (generate) |
| `POCKETBASE_URL` | Database URL | http://127.0.0.1:8090 |
| `OLLAMA_URL` | AI service URL | http://127.0.0.1:11434 |

## Documentation

- [Architecture Document](OPEN_SOURCE_ARCHITECTURE.md) - Full technical details
- [Quick Start](QUICK_START.md) - End-to-end local setup and workflow
- [Scripts Governance](scripts/README.md) - Supported vs legacy scripts

## License

MIT - 100% Open Source
