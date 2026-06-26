@echo off
title BMI UMS - Sync to Google Sheets
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   BMI UMS - Sync to Google Sheets                    ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Please enter your PocketBase admin credentials:
echo.
set /p admin_email="Admin Email: "
set /p admin_password="Admin Password: "
echo.
set /p confirm="Continue with sync? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo.
    echo ❌ Operation cancelled.
    pause
    exit /b
)

echo.
echo 🚀 Starting sync to Google Sheets...
echo.

set PB_ADMIN_EMAIL=%admin_email%
set PB_ADMIN_PASSWORD=%admin_password%

npm run sync-to-sheets

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Sync failed!
    echo    Please check your credentials and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Sync complete!
echo.
echo 🌐 View your Google Sheet:
echo    https://docs.google.com/spreadsheets/d/1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg
echo.
pause
