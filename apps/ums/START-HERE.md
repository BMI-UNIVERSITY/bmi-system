# 🚀 BMI UMS - Quick Start Guide

## ✅ Primary Working Location

**Always use this path:**
```
D:\AGENTS\bmi-ums
```

**Do NOT use:**
```
\\wsl.localhost\Ubuntu\home\nissi\bmi-ums
```
(This is the same project, but npm can't run from UNC network paths)

---

## 🎯 How to Start the Application

### Option 1: Manual Start (3 Windows)

**Window 1 - PocketBase:**
```powershell
cd D:\AGENTS\bmi-ums
wsl ./bin/pocketbase serve --http=127.0.0.1:8090
```

**Window 2 - Backend API:**
```powershell
cd D:\AGENTS\bmi-ums\backend
npm run dev
```

**Window 3 - Frontend:**
```powershell
cd D:\AGENTS\bmi-ums
npm run dev
```

### Option 2: Use Startup Script
```powershell
cd D:\AGENTS\bmi-ums
.\start-services.ps1
```

---

## 🌐 Access URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5001
- **PocketBase Admin:** http://127.0.0.1:8090/_/

---

## 🔐 Login Credentials

**Email:** `admin@bmi.edu`  
**Password:** `BMIAdmin2024Secure`

---

## ✅ Current Configuration

### Backend (`backend/.env`)
- PORT=5001
- HOST=127.0.0.1
- CORS_ORIGIN=*

### Frontend (`vite.config.ts`)
- port: 5173
- host: '127.0.0.1'
- proxy: '/api' → 'http://127.0.0.1:5001'

### PocketBase
- Port: 8090
- Admin: admin@bmi.edu / BMIAdmin2024Secure

---

## 🔧 Recent Fixes Applied

✅ **Port Configuration:** Changed from 3000/3001 to 5173/5001 (Windows reserved port range 2993-3092)  
✅ **Host Configuration:** Changed from 0.0.0.0 to 127.0.0.1 (no admin privileges needed)  
✅ **Vite Proxy:** Added detailed logging and proper configuration  
✅ **Transcript Layout:** Student name label and value now on same horizontal line  

---

## 📝 Development Notes

### When Opening in Kiro/VS Code
Use: `D:\AGENTS\bmi-ums`

### Git Operations
All git operations should be done from: `D:\AGENTS\bmi-ums`

### File Editing
Edit files in: `D:\AGENTS\bmi-ums`

---

## 🐛 Troubleshooting

### Login Issues
1. Ensure all 3 services are running
2. Check backend is on port 5001: http://localhost:5001/health
3. Check frontend is on port 5173: http://localhost:5173
4. Hard refresh browser (Ctrl+Shift+R)

### Port Already in Use
```powershell
# Find what's using the port
netstat -ano | findstr ":5001"
netstat -ano | findstr ":5173"

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Rate Limit Hit
Restart the backend server to reset rate limits.

---

## 📦 Dependencies

If you need to reinstall dependencies:

```powershell
# Frontend
cd D:\AGENTS\bmi-ums
npm install --legacy-peer-deps

# Backend
cd D:\AGENTS\bmi-ums\backend
npm install --legacy-peer-deps
```

---

## 🎉 You're All Set!

The application is now properly configured and running from `D:\AGENTS\bmi-ums`.

All fixes have been applied and tested. Happy coding! 🚀
