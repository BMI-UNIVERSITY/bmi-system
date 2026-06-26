# BMI UMS - Quick Start Guide

## Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **npm** - Comes with Node.js
- **WSL Ubuntu** (if on Windows) or native Linux/macOS

## First Time Setup

### 1. Make Scripts Executable

```bash
chmod +x setup-scripts.sh
./setup-scripts.sh
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
npm install
```

### 3. Setup Environment

```bash
# Copy environment file
cp backend/.env.example backend/.env

# Edit with your settings (optional for development)
nano backend/.env
```

### 4. Setup PocketBase + Ollama (optional)

```bash
make setup
```

This downloads PocketBase into `bin/` and ensures Ollama is installed (AI features still require the model to be pulled; `make start` handles pulling when needed).

## Daily Development

### First 30 Minutes (Recommended Path)

```bash
# 1) setup once
make setup

# 2) start stack
make start

# 3) validate baseline before coding
make verify
```

Then open `http://localhost:3000` and verify API health at `http://localhost:3001/health`.

### Start All Services

```bash
make start
```

This will start:
- PocketBase (port 8090)
- Ollama (port 11434)
- Backend API (port 3001)
- Frontend (port 3000)

### Check Service Status

```bash
./check-services.sh
```

### Stop All Services

```bash
make stop
```

### View Logs

```bash
# All logs
tail -f logs/*.log

# Specific service
tail -f logs/backend.log
tail -f logs/frontend.log
tail -f logs/pocketbase.log
```

## Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React application |
| **Backend API** | http://localhost:3001 | Hono.js API |
| **PocketBase** | http://localhost:8090 | Database & Auth |
| **PocketBase Admin** | http://localhost:8090/_/ | Admin dashboard |
| **API Docs** | http://localhost:3001/docs | API documentation |

## Default Credentials

### PocketBase Admin (First Time)
1. Go to http://localhost:8090/_/
2. Create admin account on first visit

### Application Login
- **Email:** admin@bmi.ac.ke
- **Password:** (set during admin creation)

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -ti:3000  # Frontend
lsof -ti:3001  # Backend
lsof -ti:8090  # PocketBase

# Kill process
kill $(lsof -ti:3000)
```

### Services Not Starting

```bash
# Check logs
cat logs/backend.log
cat logs/pocketbase.log

# Restart services
make stop
make start
```

### Dependencies Issues

```bash
# Clean and reinstall
rm -rf node_modules backend/node_modules
npm install
cd backend && npm install && cd ..
```

### PocketBase Issues

```bash
# Reset PocketBase (WARNING: Deletes all data)
rm -rf data/pb_data
./bin/pocketbase serve
```

## Development Workflow

### 1. Start Services

```bash
make start
```

### 2. Make Changes

Edit files in:
- `src/` - Frontend React components
- `backend/src/` - Backend API code

Changes will hot-reload automatically.

### 3. Test Changes

Open http://localhost:3000 in your browser.

### 4. Commit Changes

```bash
git add .
git commit -m "Your commit message"
git push
```

### 5. Stop Services

```bash
make stop
```

## Useful Commands

### Full Baseline Check

```bash
make verify
```

### Backend

```bash
cd backend

# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test

# Lint code
npm run lint
```

### Frontend

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database

```bash
# Run migrations
make migrate

# Create admin user
make create-admin

# Backup database
cp -r data/pb_data data/pb_data.backup
```

## Next Steps

1. ✅ Services running
2. 📖 Read [ROADMAP_TO_WORLD_CLASS.md](ROADMAP_TO_WORLD_CLASS.md)
3. 📋 Review [ACTION_PLAN.md](ACTION_PLAN.md)
4. 🚀 Start implementing Multi-Portal Architecture

## Getting Help

- **Documentation:** Check `docs/` folder
- **Issues:** Open a GitHub issue
- **Logs:** Check `logs/` directory

## Common Issues

### "Cannot find module"
```bash
npm install
cd backend && npm install
```

### "Port already in use"
```bash
make stop
make start
```

### "PocketBase not found"
```bash
make setup
```

### "Ollama not responding"
```bash
ollama serve
ollama pull llama3.2:latest
```

---

**Ready to develop!** 🎉

Run `make start` to begin.
