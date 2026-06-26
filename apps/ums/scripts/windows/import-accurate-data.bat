@echo off
echo ========================================
echo BMI UMS - 100%% Accurate Data Import
echo ========================================
echo.
echo This will:
echo  1. Clear ALL existing data
echo  2. Change Campus to Study Centre
echo  3. Set ALL Diploma students to Part-time
echo  4. Import accurate data from CSV FILES
echo  5. Auto-sync to Google Sheets
echo.

set /p ADMIN_EMAIL="Enter Admin Email: "
set /p ADMIN_PASSWORD="Enter Admin Password: "

echo.
echo Starting import...
echo.

rem Set env vars for PocketBase authentication
set POCKETBASE_ADMIN_EMAIL=%ADMIN_EMAIL%
set POCKETBASE_ADMIN_PASSWORD=%ADMIN_PASSWORD%

rem Check if PocketBase is running
curl -s http://127.0.0.1:8090/api/health > nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Error: PocketBase is not running on http://127.0.0.1:8090
    echo     Please start the services first by running start.bat
    echo.
    pause
    exit /b 1
)

npx tsx scripts/import-accurate-data.ts

echo.
echo ========================================
echo Import Complete!
echo ========================================
pause
