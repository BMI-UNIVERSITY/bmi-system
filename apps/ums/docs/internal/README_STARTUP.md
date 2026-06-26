# 🚀 BMI UMS - Startup Guide

## Quick Start

### Start All Services
```bash
# Option 1: Double-click
start.bat

# Option 2: Command line
start.bat

# Option 3: NPM
npm start
```

### Stop All Services
```bash
# Option 1: Double-click
stop.bat

# Option 2: Command line  
stop.bat

# Option 3: NPM
npm stop

# Option 4: Keyboard
Press Ctrl+C in the startup window
```

## What Gets Started

When you run `start.bat` or `npm start`, the following services start automatically:

1. ✅ **PocketBase Database** (port 8090)
   - SQLite database with admin UI
   - Access: http://localhost:8090/_/

2. ✅ **Backend API** (port 3001)
   - Express.js REST API
   - Access: http://localhost:3001

3. ✅ **Frontend** (port 3000)
   - React + Vite development server
   - Access: http://localhost:3000

4. ✅ **Ngrok Tunnel** (public HTTPS)
   - Public verification portal
   - Access: https://lax-scarious-lindsey.ngrok-free.dev/verify

5. ✅ **Local Proxy** (port 4000)
   - Routes traffic between services

## Service Status

The startup script shows real-time status every 5 seconds:

```
[2026-05-21 13:26:29] PocketBase UP | Backend API UP | Frontend UP | Tunnel UP
```

All services must show "UP" for the system to work correctly.

## Access Points

### Local Development
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:3001  
- 🗄️ **PocketBase Admin**: http://localhost:8090/_/
- 🔐 **Local Verification**: http://localhost:3000/verify

### Public Access
- 🌍 **Verification Portal**: https://lax-scarious-lindsey.ngrok-free.dev/verify
- This URL is **permanent** - works every time you restart

## Logs

All service logs are saved in the `logs/` directory:

- `pocketbase_out.log` / `pocketbase_err.log` - Database logs
- `backend_out.log` / `backend_err.log` - API logs
- `frontend_out.log` / `frontend_err.log` - Frontend logs
- `ngrok_setup.log` / `ngrok_setup_err.log` - Tunnel setup logs
- `ngrok.log` - Tunnel runtime logs

View logs in real-time:
```bash
# Windows PowerShell
Get-Content logs\backend_out.log -Wait

# Command Prompt
type logs\backend_out.log
```

## Troubleshooting

### Services Won't Start

1. **Stop all services first:**
   ```bash
   stop.bat
   ```

2. **Check if ports are busy:**
   - Port 3000 (Frontend)
   - Port 3001 (Backend)
   - Port 4000 (Proxy)
   - Port 8090 (PocketBase)

3. **Try starting again:**
   ```bash
   start.bat
   ```

### Verification Portal Not Working

1. **Check ngrok installation:**
   ```bash
   ngrok version
   ```

2. **Check ngrok configuration:**
   ```bash
   ngrok config check
   ```

3. **View tunnel URL:**
   ```bash
   type logs\tunnel-url.txt
   ```

4. **Manually restart tunnel:**
   ```bash
   npm run tunnel
   ```

### Check Service Logs

If a service shows "DOWN", check its logs:

```bash
# PocketBase
type logs\pocketbase_err.log

# Backend
type logs\backend_err.log

# Frontend
type logs\frontend_err.log

# Ngrok
type logs\ngrok_setup_err.log
```

## First Time Setup

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ npm installed
- ✅ ngrok installed and configured

### Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update `NGROK_DOMAIN` with your ngrok domain
   - Copy `backend/.env.example` to `backend/.env`

3. **Start the application:**
   ```bash
   start.bat
   ```

## Development Workflow

### Daily Development
```bash
# Morning: Start all services
npm start

# Work on your features...

# Evening: Stop all services
npm stop
```

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Type Check
```bash
npm run typecheck
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User Action                       │
│              (start.bat or npm start)                │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│           scripts/dev/start-all.ps1                  │
│         (PowerShell Orchestration)                   │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
   PocketBase    Backend API    Frontend    Ngrok Tunnel
   (port 8090)   (port 3001)   (port 3000)  (public URL)
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
                      ▼
              Local Proxy (port 4000)
                      │
                      ▼
            Routes traffic between
            services and public URL
```

## Benefits

### Before Consolidation
- ❌ 7 different startup scripts
- ❌ Confusion about which to use
- ❌ Manual verification portal setup
- ❌ Inconsistent behavior

### After Consolidation
- ✅ 2 simple commands (start/stop)
- ✅ Clear documentation
- ✅ Automatic verification portal
- ✅ Consistent behavior
- ✅ NPM integration
- ✅ Real-time monitoring

## Additional Resources

- 📖 **Full Documentation**: `START_HERE.md`
- 🔐 **Verification Portal**: `VERIFICATION_PORTAL_SETUP.md`
- 📋 **Consolidation Details**: `STARTUP_CONSOLIDATION.md`
- 🔒 **Security**: `SECURITY.md`
- 🤝 **Contributing**: `CONTRIBUTING.md`

---

**Last Updated**: 2026-05-21  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
