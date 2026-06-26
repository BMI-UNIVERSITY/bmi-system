#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BMI UMS - Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the current directory
$rootDir = Get-Location

Write-Host "[1/3] Starting PocketBase Database..." -ForegroundColor Yellow
Set-Location "$rootDir\bin"
Start-Process -FilePath ".\pocketbase.exe" -ArgumentList "serve", "--dir=pb_data" -WindowStyle Normal
Set-Location $rootDir

Write-Host "Waiting for PocketBase to start..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[2/3] Starting Backend API..." -ForegroundColor Yellow
Set-Location "$rootDir\backend"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "npm run dev" -WindowStyle Normal
Set-Location $rootDir

Write-Host "Waiting for Backend to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "[3/3] Starting Frontend..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All services are starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor White
Write-Host "- Frontend:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "- Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "- PocketBase:  http://localhost:8090" -ForegroundColor Cyan
Write-Host "- PB Admin:    http://localhost:8090/_/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring..." -ForegroundColor Yellow

# Monitor services
while ($true) {
    Start-Sleep -Seconds 10
    
    try {
        # Check PocketBase
        $pb = Invoke-WebRequest -Uri "http://localhost:8090/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        $pbStatus = if ($pb.StatusCode -eq 200) { "✓" } else { "✗" }
    } catch {
        $pbStatus = "✗"
    }
    
    try {
        # Check Backend
        $api = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        $apiStatus = if ($api.StatusCode -eq 200) { "✓" } else { "✗" }
    } catch {
        $apiStatus = "✗"
    }
    
    try {
        # Check Frontend
        $fe = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        $feStatus = if ($fe.StatusCode -eq 200) { "✓" } else { "✗" }
    } catch {
        $feStatus = "✗"
    }
    
    Write-Host "Status: PocketBase $pbStatus | Backend API $apiStatus | Frontend $feStatus" -ForegroundColor Gray
}