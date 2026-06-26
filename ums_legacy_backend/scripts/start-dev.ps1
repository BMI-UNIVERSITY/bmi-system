# BMI UMS - Robust Dev Startup Script
# Clears zombie processes on port 3001 and starts the API

$PORT = 3001
Write-Host "Checking for zombie processes on port $PORT..." -ForegroundColor Cyan

while ($true) {
    $process = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($process) {
        $targetPid = $process.OwningProcess
        Write-Host "Found listening process (PID: $targetPid) on port $PORT. Terminating..." -ForegroundColor Yellow
        Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    } else {
        Write-Host "Port $PORT is clear." -ForegroundColor Green
        break
    }
}

Write-Host "Starting BMI UMS API with Watchdog stability monitor..." -ForegroundColor Green
npx tsx scripts/watchdog.ts
