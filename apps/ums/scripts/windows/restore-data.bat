@echo off
title BMI UMS - Restore Accurate Data
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   BMI UMS - Restore Accurate Data                    ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo This will:
echo   1. Clean existing student and academic data
echo   2. Restore correct admission numbers (KEN-DP 225-XXX)
echo   3. Import all data from DATABASE folder
echo.
echo ⚠️  WARNING: This will delete existing student data!
echo.
echo 📋 Prerequisites:
echo   - PocketBase must be running
echo   - Admin account must exist (admin@bmi.ac.ke / Admin@2025)
echo.
echo If you haven't created an admin account yet:
echo   1. Open http://localhost:8090/_/
echo   2. Create admin with email: admin@bmi.ac.ke
echo   3. Set password: Admin@2025
echo.
set /p confirm="Are you sure you want to continue? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo.
    echo ❌ Operation cancelled.
    pause
    exit /b
)

echo.
echo 🚀 Starting data restoration...
echo.

npm run restore-data

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Data restoration failed!
    echo.
    echo Common issues:
    echo   1. PocketBase not running - Run: npm start
    echo   2. Admin account doesn't exist - Run: scripts\setup-admin.bat
    echo   3. Wrong credentials - Check admin@bmi.ac.ke / Admin@2025
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Data restoration complete!
echo.
echo 📊 Verify the data:
echo   - Open PocketBase Admin: http://localhost:8090/_/
echo   - Check Students collection
echo   - Verify admission numbers (KEN-DP 225-XXX format)
echo.
pause
