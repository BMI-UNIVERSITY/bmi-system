# 🚀 BMI UMS - Quick Start Guide

## Starting the Application

### Method 1: Double-Click (Easiest)
Simply double-click:
```
start.bat
```

### Method 2: Command Line
```bash
start.bat
```

### Method 3: NPM Script
```bash
npm start
```

All three methods do the same thing - start all services automatically!

### What Gets Started
The `start.bat` script automatically starts ALL services:
1. ✅ PocketBase Database (port 8090)
2. ✅ Backend API (port 3001)
3. ✅ Frontend (port 3000)
4. ✅ Ngrok Tunnel (public verification portal)
5. ✅ Local Proxy (port 4000)

### Access Points

**Local Development:**
- 🌐 Frontend: http://localhost:3000
- 🔌 Backend API: http://localhost:3001
- 🗄️ PocketBase Admin: http://localhost:8090/_/

**Public Access:**
- 🔐 Verification Portal: https://lax-scarious-lindsey.ngrok-free.dev/verify

### Service Monitoring
The startup script shows real-time status every 5 seconds:
```
[2026-05-21 12:55:00] PocketBase UP | Backend API UP | Frontend UP | Tunnel UP
```

## Stopping the Application

### Method 1: Double-Click
Double-click:
```
stop.bat
```

### Method 2: Command Line
```bash
stop.bat
```

### Method 3: NPM Script
```bash
npm stop
```

### Method 4: Quick Stop
Press `Ctrl+C` in the startup window to stop all services immediately.

All methods gracefully stop all services.

## Troubleshooting

### Services Won't Start
1. Check if ports are already in use:
   - Port 3000 (Frontend)
   - Port 3001 (Backend)
   - Port 4000 (Proxy)
   - Port 8090 (PocketBase)

2. Run stop script first:
   ```bash
   stop.bat
   ```

3. Try starting again:
   ```bash
   start.bat
   ```

### Check Logs
All logs are saved in the `logs/` directory:
- `pocketbase_out.log` / `pocketbase_err.log`
- `backend_out.log` / `backend_err.log`
- `frontend_out.log` / `frontend_err.log`
- `ngrok_setup.log` / `ngrok_setup_err.log`
- `ngrok.log` (tunnel logs)

### Verification Portal Not Working
1. Check if ngrok is installed:
   ```bash
   ngrok version
   ```

2. Check ngrok configuration:
   ```bash
   ngrok config check
   ```

3. View tunnel URL:
   ```bash
   type logs\tunnel-url.txt
   ```

4. Manually restart tunnel:
   ```bash
   npm run tunnel
   ```

## First Time Setup

### Prerequisites
- Node.js 18+ installed
- npm installed
- ngrok installed and configured (for verification portal)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```

3. Configure environment:
   - Copy `.env.example` to `.env`
   - Update `NGROK_DOMAIN` with your ngrok domain
   - Copy `backend/.env.example` to `backend/.env`

4. Start the application:
   ```bash
   start.bat
   ```

## Development Commands

### Build Frontend
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

### Lint Code
```bash
npm run lint
```

### E2E Tests
```bash
npm run e2e
```

## Production Deployment

See `docs/DEPLOYMENT.md` for production deployment instructions.

## Need Help?

- 📖 Documentation: `docs/` directory
- 🔒 Security: `SECURITY.md`
- 🤝 Contributing: `CONTRIBUTING.md`
- 📋 Quick Start: `QUICK_START.md`

---

**Last Updated**: 2026-05-21
**Version**: 1.0.0
