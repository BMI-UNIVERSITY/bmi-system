#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BMI UMS - Starting Background Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Resolve directory
$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Get-Location
}
$rootDir = $scriptDir

# Ensure logs directory exists
$logsDir = Join-Path $rootDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

Write-Host "[1/4] Stopping any existing services..." -ForegroundColor Yellow
& "$rootDir\stop.bat"
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "[2/4] Starting PocketBase in background..." -ForegroundColor Cyan
$pbProcess = Start-Process -FilePath "$rootDir\bin\pocketbase.exe" `
    -ArgumentList "serve", "--dir=data\pb_data", "--migrationsDir=pb_migrations", "--http=127.0.0.1:8090" `
    -WorkingDirectory $rootDir `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput "$logsDir\pocketbase_out.log" `
    -RedirectStandardError "$logsDir\pocketbase_err.log"

Write-Host "PocketBase started (PID: $($pbProcess.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] Starting Backend API in background..." -ForegroundColor Cyan
$backendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory "$rootDir\backend" `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput "$logsDir\backend_out.log" `
    -RedirectStandardError "$logsDir\backend_err.log"

Write-Host "Backend API started (PID: $($backendProcess.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "[4/5] Starting Frontend in background..." -ForegroundColor Cyan
$frontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory $rootDir `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput "$logsDir\frontend_out.log" `
    -RedirectStandardError "$logsDir\frontend_err.log"

Write-Host "Frontend started (PID: $($frontendProcess.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Starting Verification Portal (Ngrok Tunnel)..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
$tunnelProcess = Start-Process -FilePath "node" `
    -ArgumentList "scripts\ngrok-tunnel.cjs" `
    -WorkingDirectory $rootDir `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput "$logsDir\ngrok_setup.log" `
    -RedirectStandardError "$logsDir\ngrok_setup_err.log"

Write-Host "Verification Portal tunnel started (PID: $($tunnelProcess.Id))" -ForegroundColor Green
Write-Host "Waiting for tunnel to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All services started in background!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services will continue running even after closing this window." -ForegroundColor White
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor White
Write-Host "- Frontend:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "- Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "- PocketBase:  http://localhost:8090" -ForegroundColor Cyan
Write-Host "- PB Admin:    http://localhost:8090/_/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Process IDs:" -ForegroundColor Yellow
Write-Host "- PocketBase: $($pbProcess.Id)" -ForegroundColor Gray
Write-Host "- Backend:    $($backendProcess.Id)" -ForegroundColor Gray
Write-Host "- Frontend:   $($frontendProcess.Id)" -ForegroundColor Gray
Write-Host "- Tunnel:     $($tunnelProcess.Id)" -ForegroundColor Gray
Write-Host ""

# Read the tunnel URL from the log file
$tunnelUrlFile = Join-Path $logsDir "tunnel-url.txt"
if (Test-Path $tunnelUrlFile) {
    $tunnelUrl = Get-Content $tunnelUrlFile -Raw
    $tunnelUrl = $tunnelUrl.Trim()
    Write-Host "Public Verification Portal:" -ForegroundColor Yellow
    Write-Host "- Verification: $tunnelUrl/verify" -ForegroundColor Green
    Write-Host ""
}

Write-Host "To stop services, run: .\stop.bat" -ForegroundColor Yellow
Write-Host "Logs are available in the 'logs' folder." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit (services will keep running)..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
