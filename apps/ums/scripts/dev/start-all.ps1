#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BMI UMS - Kill and Restart All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Resolve directory
$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Join-Path (Get-Location) "scripts\dev"
}
$rootDir = Split-Path (Split-Path $scriptDir -Parent) -Parent

# Ensure logs directory exists
$logsDir = Join-Path $rootDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

Write-Host "[1/2] Stopping any existing services..." -ForegroundColor Yellow
& "$rootDir\scripts\dev\stop-all-windows.ps1"

Write-Host ""
Write-Host "[2/5] Starting all services..." -ForegroundColor Yellow

# Start PocketBase
Write-Host "Starting PocketBase Database (output to logs\pocketbase.log)..." -ForegroundColor Cyan
Start-Process -FilePath "$rootDir\bin\pocketbase.exe" -ArgumentList "serve", "--dir=data\pb_data", "--migrationsDir=pb_migrations", "--http=127.0.0.1:8090" -WorkingDirectory $rootDir -NoNewWindow -RedirectStandardOutput "$logsDir\pocketbase_out.log" -RedirectStandardError "$logsDir\pocketbase_err.log"

# Start Backend API
Write-Host "Starting Backend API (output to logs\backend.log)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev < nul" -WorkingDirectory "$rootDir\backend" -NoNewWindow -RedirectStandardOutput "$logsDir\backend_out.log" -RedirectStandardError "$logsDir\backend_err.log"

# Start Frontend
Write-Host "Starting Frontend (output to logs\frontend.log)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev < nul" -WorkingDirectory $rootDir -NoNewWindow -RedirectStandardOutput "$logsDir\frontend_out.log" -RedirectStandardError "$logsDir\frontend_err.log"

# Wait for backend services to be ready
Write-Host ""
Write-Host "[3/5] Waiting for backend services to be ready (this may take 10-15s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

# Start Ngrok Tunnel
Write-Host ""
Write-Host "[4/5] Starting Ngrok Tunnel for Verification Portal..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "scripts\ngrok-tunnel.cjs" -WorkingDirectory $rootDir -NoNewWindow -RedirectStandardOutput "$logsDir\ngrok_setup.log" -RedirectStandardError "$logsDir\ngrok_setup_err.log"

Write-Host "Ngrok tunnel starting (check logs\ngrok_setup.log for details)..." -ForegroundColor Cyan
Write-Host ""
Write-Host "[5/5] Waiting for tunnel to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All services launched successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor White
Write-Host "- Frontend:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "- Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "- PocketBase:  http://localhost:8090" -ForegroundColor Cyan
Write-Host "- PB Admin:    http://localhost:8090/_/" -ForegroundColor Cyan
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

Write-Host "Monitoring service status (Press Ctrl+C to stop services)..." -ForegroundColor Yellow
Write-Host ""

# Monitor services and keep process group alive
# On exit (Ctrl+C), stop services
$script:running = $true

# Register cleanup on exit
$cleanupAction = {
    Write-Host "`nStopping all services..." -ForegroundColor Yellow
    & "$rootDir\scripts\dev\stop-all-windows.ps1"
    $script:running = $false
    exit 0
}

# In PowerShell, we can catch Ctrl+C using a try/finally block around the main loop
try {
    while ($script:running) {
        $pbStatus = "DOWN"
        try {
            $pb = Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($pb.StatusCode -eq 200) { $pbStatus = "UP" }
        } catch {
            $pbStatus = "DOWN"
        }
        
        $apiStatus = "DOWN"
        try {
            $api = Invoke-WebRequest -Uri "http://127.0.0.1:3001/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($api.StatusCode -eq 200) { $apiStatus = "UP" }
        } catch {
            $apiStatus = "DOWN"
        }
        
        $feStatus = "DOWN"
        try {
            $fe = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($fe.StatusCode -eq 200) { $feStatus = "UP" }
        } catch {
            $feStatus = "DOWN"
        }
        
        # Check Tunnel Status (Smart Check)
        $tunnelStatus = "DOWN"
        try {
            $tunnelUrlFile = Join-Path $logsDir "tunnel-url.txt"
            if (Test-Path $tunnelUrlFile) {
                $tunnelUrl = (Get-Content $tunnelUrlFile -Raw).Trim()
                # Check local proxy first (port 4000) - Use 127.0.0.1 for stability on Windows
                try {
                    $localProxy = Invoke-WebRequest -Uri "http://127.0.0.1:4000/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                    if ($localProxy.StatusCode -ge 200) {
                        # Local proxy process is alive!
                        $tunnelStatus = "UP (Local)"
                        
                        # Now check public tunnel with a longer timeout
                        $tunnel = Invoke-WebRequest -Uri "$tunnelUrl/verify" -UseBasicParsing -TimeoutSec 8 -ErrorAction SilentlyContinue
                        if ($tunnel.StatusCode -eq 200) { 
                            $tunnelStatus = "UP" 
                        }
                    }
                } catch {
                    $tunnelStatus = "DOWN"
                }
            }
        } catch {
            $tunnelStatus = "DOWN"
        }
        
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] PocketBase $pbStatus | Backend API $apiStatus | Frontend $feStatus | Tunnel $tunnelStatus" -ForegroundColor Gray
        
        Start-Sleep -Seconds 5
    }
}
finally {
    & $cleanupAction
}