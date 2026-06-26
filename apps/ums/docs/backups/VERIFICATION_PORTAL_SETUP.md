# Verification Portal - Automatic Startup Guide

## Overview
The verification portal is now configured to start automatically with all other services. No manual intervention needed!

## What Happens Automatically

When you run `start-all.bat` or `npm run dev`, the system will:

1. ✅ **Stop any existing services** (clean slate)
2. ✅ **Start PocketBase** (database on port 8090)
3. ✅ **Start Backend API** (on port 3001)
4. ✅ **Start Frontend** (on port 3000)
5. ✅ **Start Ngrok Tunnel** (public verification portal)
6. ✅ **Start Local Proxy** (routes traffic on port 4000)
7. ✅ **Monitor all services** (shows status every 5 seconds)

## Access Points

### Local Development
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PocketBase Admin: http://localhost:8090/_/
- Local Verification: http://localhost:3000/verify

### Public Access (via Ngrok)
- Verification Portal: https://lax-scarious-lindsey.ngrok-free.dev/verify
- This URL is **PERMANENT** - same URL every restart
- QR codes on certificates/transcripts point to this URL

## How It Works

### Ngrok Configuration
The ngrok tunnel is configured in `.env`:
```env
NGROK_DOMAIN=lax-scarious-lindsey.ngrok-free.dev
VITE_VERIFY_URL=https://lax-scarious-lindsey.ngrok-free.dev
```

### Automatic Startup Flow
1. `start-all.bat` → calls `scripts/dev/start-all.ps1`
2. PowerShell script starts all services in order
3. After backend is ready, runs `node scripts/ngrok-tunnel.cjs`
4. Ngrok script:
   - Stops old tunnels
   - Starts new tunnel with permanent domain
   - Updates environment variables
   - Rebuilds frontend (bakes URL into QR codes)
   - Starts local proxy on port 4000
   - Verifies all services are running

### Service Monitoring
The startup script continuously monitors:
- PocketBase status (port 8090)
- Backend API status (port 3001)
- Frontend status (port 3000)
- Tunnel status (public URL)

Status is displayed every 5 seconds:
```
[2026-05-21 12:55:00] PocketBase UP | Backend API UP | Frontend UP | Tunnel UP
```

## Troubleshooting

### If Tunnel Shows "DOWN"
1. Check `logs/ngrok_setup.log` for errors
2. Verify ngrok is installed: `ngrok version`
3. Verify ngrok auth token is configured: `ngrok config check`
4. Manually restart tunnel: `npm run tunnel`

### If Services Don't Start
1. Check individual log files in `logs/` directory:
   - `pocketbase_out.log` / `pocketbase_err.log`
   - `backend_out.log` / `backend_err.log`
   - `frontend_out.log` / `frontend_err.log`
   - `ngrok_setup.log` / `ngrok_setup_err.log`
2. Manually stop all: `scripts\dev\stop-all-windows.ps1`
3. Try starting again: `start-all.bat`

### If Ngrok Domain Changes
1. Update `.env` file with new domain:
   ```env
   NGROK_DOMAIN=your-new-domain.ngrok-free.dev
   VITE_VERIFY_URL=https://your-new-domain.ngrok-free.dev
   ```
2. Restart all services: `start-all.bat`
3. Frontend will rebuild automatically with new URL

## Manual Commands

### Start Everything (Recommended)
```bash
start-all.bat
```

### Start Only Tunnel (if already running)
```bash
npm run tunnel
```

### Stop Everything
```bash
scripts\dev\stop-all-windows.ps1
```

### Check Tunnel Status
```bash
# View tunnel URL
type logs\tunnel-url.txt

# View tunnel logs
type logs\ngrok.log
```

## Benefits of This Setup

✅ **Zero Manual Steps** - Everything starts automatically
✅ **Permanent URL** - Same verification URL every time
✅ **QR Code Compatibility** - All generated QR codes work forever
✅ **Service Monitoring** - Real-time status of all components
✅ **Clean Shutdown** - Ctrl+C stops everything gracefully
✅ **Error Logging** - All logs saved for troubleshooting

## Security Notes

- Ngrok tunnel is secured with your ngrok account
- Free ngrok accounts have rate limits (check ngrok.com)
- For production, consider upgrading to ngrok paid plan or using a custom domain
- All verification requests are logged in backend for audit trail

## Next Steps

1. ✅ Verification portal is ready to use
2. ✅ Generate certificates/transcripts - QR codes will work
3. ✅ Share verification URL with stakeholders
4. ✅ Monitor logs for any issues

---

**Last Updated**: 2026-05-21
**Status**: ✅ Fully Automated
