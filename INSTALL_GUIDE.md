# BMI Installation Guide After Fixes

## Quick Start (Recommended)

Since the monorepo workspace install is timing out, install dependencies per app:

### Step 1: Install Shared Package
```powershell
cd D:\BMI\packages\shared
npm install
npm run build
```

### Step 2: Install API
```powershell
cd D:\BMI\apps\api
npm install
```

### Step 3: Install Portal
```powershell
cd D:\BMI\apps\portal
npm install
```

### Step 4: Install UMS
```powershell
cd D:\BMI\apps\ums
npm install
```

---

## Verification

After successful installation, verify the fixes:

### 1. Type Check All Apps
```powershell
# API
cd D:\BMI\apps\api
npm run type-check

# Portal (no type-check script, will verify during build)
cd D:\BMI\apps\portal
npm run build

# UMS
cd D:\BMI\apps\ums
npm run type-check
```

### 2. Run Tests
```powershell
# API Tests
cd D:\BMI\apps\api
npm test

# Portal Tests
cd D:\BMI\apps\portal
npm test

# UMS Tests
cd D:\BMI\apps\ums
npm run test:unit
```

### 3. Start Dev Servers
```powershell
# Terminal 1 - API
cd D:\BMI\apps\api
npm run dev

# Terminal 2 - Portal
cd D:\BMI\apps\portal
npm run dev

# Terminal 3 - UMS
cd D:\BMI\apps\ums
npm run dev
```

---

## Troubleshooting

### If individual npm install fails:
```powershell
# Clear npm cache
npm cache clean --force

# Try with legacy peer deps
npm install --legacy-peer-deps
```

### If TypeScript errors appear:
```powershell
# Verify all apps are on TypeScript 5.8.2
npm list typescript
```

### If @bmi/shared not found:
```powershell
# Rebuild shared package
cd D:\BMI\packages\shared
npm run build
```

---

## What Was Fixed

✅ Database index error  
✅ TypeScript version conflicts (all now 5.8.2)  
✅ Dependency version sync (React Router, Vite, Vitest)  
✅ UMS now imports from @bmi/shared  
✅ Portal CSRF moved to memory (security fix)  
✅ Workspace configuration cleaned  

See `FIXES_APPLIED.md` for detailed information.
