# 🔐 Restore Data with Your Credentials

Since you already have an admin account, follow these steps:

## Option 1: Use Interactive Script (Recommended)

Run this command and enter your credentials when prompted:
```bash
.\restore-with-credentials.bat
```

It will ask for:
1. Your admin email
2. Your admin password
3. Confirmation to proceed

## Option 2: Set Environment Variables

Set your credentials as environment variables, then run the restore:

```powershell
# Set your credentials
$env:PB_ADMIN_EMAIL = "your-email@example.com"
$env:PB_ADMIN_PASSWORD = "your-password"

# Run restore
npm run restore-data
```

## Option 3: Edit the Script Directly

1. Open `scripts/restore-accurate-data.ts`
2. Find these lines (around line 60):
   ```typescript
   const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@bmi.ac.ke';
   const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'Admin@2025';
   ```
3. Replace with your credentials:
   ```typescript
   const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'your-email@example.com';
   const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'your-password';
   ```
4. Run: `npm run restore-data`

## Quick Test

To verify your credentials work, try logging into PocketBase admin:
1. Open: http://localhost:8090/_/
2. Enter your email and password
3. If you can login, those are the correct credentials to use

## What Happens Next

Once you provide the correct credentials, the script will:
1. ✅ Authenticate with PocketBase
2. ✅ Clean existing student/course data
3. ✅ Import 62 students with correct admission numbers (KEN-DP 225-XXX)
4. ✅ Import 35 courses
5. ✅ Import 7 campuses
6. ✅ Import 500+ academic records

---

**Need Help?**
- Can't remember your password? Reset it in PocketBase admin panel
- Want to create a new admin? Run: `.\create-admin.bat`
