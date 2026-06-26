# Startup Scripts Consolidation

## Summary
All startup scripts have been consolidated into a single, unified startup system.

## What Was Changed

### ✅ New Unified Scripts
- **`start.bat`** - Single entry point to start all services
- **`stop.bat`** - Single entry point to stop all services
- **`npm start`** - NPM command to start all services
- **`npm stop`** - NPM command to stop all services

### 🗑️ Removed Redundant Scripts
The following scripts were removed as they were redundant:
1. ❌ `start-all.bat` (replaced by `start.bat`)
2. ❌ `startup.bat` (replaced by `start.bat`)
3. ❌ `start-all.sh` (Linux - not needed for Windows-focused project)
4. ❌ `stop-all.sh` (Linux - not needed for Windows-focused project)
5. ❌ `scripts/startup.bat` (duplicate)
6. ❌ `scripts/start-all.sh` (duplicate)
7. ❌ `scripts/stop-all.sh` (duplicate)

### 📁 Core Scripts (Kept)
These are the actual implementation scripts that power the system:
- ✅ `scripts/dev/start-all.ps1` - PowerShell implementation
- ✅ `scripts/dev/stop-all-windows.ps1` - PowerShell stop implementation
- ✅ `scripts/ngrok-tunnel.cjs` - Ngrok tunnel setup
- ✅ `scripts/local-proxy.cjs` - Local proxy server

## How It Works

### Architecture
```
User Action
    ↓
start.bat OR npm start
    ↓
scripts/dev/start-all.ps1
    ↓
Starts in order:
    1. PocketBase (port 8090)
    2. Backend API (port 3001)
    3. Frontend (port 3000)
    4. Ngrok Tunnel (public URL)
    5. Local Proxy (port 4000)
    ↓
Monitors all services
```

### What Gets Started Automatically
1. **PocketBase Database** - SQLite database with admin UI
2. **Backend API** - Express.js REST API
3. **Frontend** - React + Vite development server
4. **Ngrok Tunnel** - Public HTTPS URL for verification portal
5. **Local Proxy** - Routes traffic between services

### Service Monitoring
The startup script continuously monitors all services and displays status:
```
[2026-05-21 12:55:00] PocketBase UP | Backend API UP | Frontend UP | Tunnel UP
```

## Usage

### Start Everything
Choose any method:
```bash
# Method 1: Double-click
start.bat

# Method 2: Command line
start.bat

# Method 3: NPM
npm start
```

### Stop Everything
Choose any method:
```bash
# Method 1: Double-click
stop.bat

# Method 2: Command line
stop.bat

# Method 3: NPM
npm stop

# Method 4: Keyboard
Press Ctrl+C in startup window
```

## Benefits

### Before Consolidation
- ❌ 7 different startup scripts
- ❌ Confusion about which one to use
- ❌ Inconsistent behavior
- ❌ Hard to maintain
- ❌ Some scripts outdated

### After Consolidation
- ✅ 2 simple entry points (start.bat, stop.bat)
- ✅ Clear documentation
- ✅ Consistent behavior
- ✅ Easy to maintain
- ✅ NPM integration
- ✅ Automatic verification portal startup

## Documentation

### Main Guides
- **`START_HERE.md`** - Quick start guide for users
- **`VERIFICATION_PORTAL_SETUP.md`** - Verification portal details
- **`STARTUP_CONSOLIDATION.md`** - This document

### For Developers
- All startup logic is in `scripts/dev/start-all.ps1`
- All stop logic is in `scripts/dev/stop-all-windows.ps1`
- Modify these files to change startup behavior

## Troubleshooting

### If Services Don't Start
1. Run stop script first: `stop.bat`
2. Check logs in `logs/` directory
3. Try starting again: `start.bat`

### If Ports Are Busy
The stop script automatically kills processes on these ports:
- 3000 (Frontend)
- 3001 (Backend)
- 4000 (Proxy)
- 8090 (PocketBase)

### If Ngrok Fails
1. Check if ngrok is installed: `ngrok version`
2. Check ngrok auth: `ngrok config check`
3. View logs: `type logs\ngrok_setup.log`
4. Manually restart: `npm run tunnel`

## Migration Notes

### For Existing Users
If you were using old scripts:
- Replace `start-all.bat` with `start.bat`
- Replace `startup.bat` with `start.bat`
- Use `npm start` for convenience

### For CI/CD
Update your CI/CD pipelines to use:
```bash
npm start  # Start all services
npm stop   # Stop all services
```

## Future Improvements

Potential enhancements:
- [ ] Add health check endpoint aggregation
- [ ] Add service restart on failure
- [ ] Add log rotation
- [ ] Add performance monitoring
- [ ] Add Docker Compose alternative

---

**Date**: 2026-05-21
**Status**: ✅ Complete
**Impact**: Simplified from 7 scripts to 2 entry points
