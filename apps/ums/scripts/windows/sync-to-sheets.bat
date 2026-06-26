@echo off
title BMI UMS - Sync to Google Sheets
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   BMI UMS - Sync to Google Sheets                    ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo This will sync all data from PocketBase to Google Sheets:
echo   - Campuses
echo   - Modules
echo   - Courses
echo   - Students (with correct admission numbers)
echo   - Academic Records
echo.
set /p confirm="Continue? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo.
    echo ❌ Operation cancelled.
    pause
    exit /b
)

echo.
echo 🚀 Starting sync...
echo.

npm run sync-to-sheets

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Sync failed!
    echo.
    echo Common issues:
    echo   1. PocketBase not running - Run: npm start
    echo   2. Google credentials missing - Check backend/google-credentials.json
    echo   3. Wrong admin credentials
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
