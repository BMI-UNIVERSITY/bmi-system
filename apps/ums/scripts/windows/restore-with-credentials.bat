@echo off
title BMI UMS - Restore Data with Your Credentials
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   BMI UMS - Restore Accurate Data                    ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Please enter your PocketBase admin credentials:
echo.
set /p admin_email="Admin Email: "
set /p admin_password="Admin Password: "
echo.
echo ⚠️  WARNING: This will delete existing student data!
echo.
set /p confirm="Continue with data restoration? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo.
    echo ❌ Operation cancelled.
    pause
    exit /b
)

echo.
echo 🚀 Starting data restoration...
echo.

set PB_ADMIN_EMAIL=%admin_email%
set PB_ADMIN_PASSWORD=%admin_password%

npm run restore-data

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Data restoration failed!
    echo    Please check your credentials and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Data restoration complete!
echo.
pause
