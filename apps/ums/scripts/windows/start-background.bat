@echo off
title BMI UMS - Starting Background Services
echo ========================================
echo BMI UMS - Starting Background Services
echo ========================================
echo.

REM Get the script directory
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%"

REM Ensure logs directory exists
if not exist "%ROOT_DIR%logs" mkdir "%ROOT_DIR%logs"

echo [1/4] Stopping any existing services...
call "%ROOT_DIR%stop.bat"

echo.
echo [2/4] Starting PocketBase in background...
start "PocketBase" /B "%ROOT_DIR%bin\pocketbase.exe" serve --dir=data\pb_data --migrationsDir=pb_migrations --http=127.0.0.1:8090 > "%ROOT_DIR%logs\pocketbase_out.log" 2> "%ROOT_DIR%logs\pocketbase_err.log"

echo [3/4] Starting Backend API in background...
cd /d "%ROOT_DIR%backend"
start "Backend API" /B cmd /c "npm run dev > ..\logs\backend_out.log 2> ..\logs\backend_err.log"

echo [4/5] Starting Frontend in background...
cd /d "%ROOT_DIR%"
start "Frontend" /B cmd /c "npm run dev > logs\frontend_out.log 2> logs\frontend_err.log"

echo [5/5] Starting Verification Portal (Ngrok Tunnel)...
timeout /t 3 /nobreak > nul
start "Verification Portal" /B node scripts\ngrok-tunnel.cjs > logs\ngrok_setup.log 2> logs\ngrok_setup_err.log

echo.
echo Waiting for tunnel to initialize...
timeout /t 5 /nobreak > nul

echo.
echo ========================================
echo All services started in background!
echo ========================================
echo.
echo Services will continue running even after closing this window.
echo.
echo Access URLs:
echo - Frontend:    http://localhost:3000
echo - Backend API: http://localhost:3001
echo - PocketBase:  http://localhost:8090
echo - PB Admin:    http://localhost:8090/_/
echo.

REM Check for tunnel URL
if exist "%ROOT_DIR%logs\tunnel-url.txt" (
    echo Public Verification Portal:
    type "%ROOT_DIR%logs\tunnel-url.txt"
    echo /verify
    echo.
)

echo To stop services, run: stop.bat
echo.
echo Logs are available in the 'logs' folder.
echo.
pause
