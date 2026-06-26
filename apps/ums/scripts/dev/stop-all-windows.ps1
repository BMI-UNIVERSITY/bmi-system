# BMI UMS - Stop All Services on Windows
Write-Host "Stopping all BMI UMS services on Windows..." -ForegroundColor Yellow

# 1. Kill by port
$ports = @(3000, 3001, 4000, 8090)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            if ($p -and $p -ne 0) {
                Write-Host "Killing process $p using port $port..." -ForegroundColor Cyan
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# 2. Kill by process name
$names = @("pocketbase", "ngrok", "cloudflared")
foreach ($name in $names) {
    $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
    foreach ($proc in $procs) {
        Write-Host "Killing process $($proc.Name) with PID $($proc.Id)..." -ForegroundColor Cyan
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

# 3. Kill related Node processes
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    $cmd = $_.CommandLine
    if ($cmd -and ($cmd -like "*bmi-ums*" -or $cmd -like "*vite*" -or $cmd -like "*tsx*" -or $cmd -like "*local-proxy*")) {
        Write-Host "Killing Node process ($($_.ProcessId)): $cmd" -ForegroundColor Cyan
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

# 4. Clean PID files
if (Test-Path "logs") {
    Get-ChildItem -Path "logs" -Filter "*.pid" | ForEach-Object {
        Write-Host "Removing PID file: $($_.Name)" -ForegroundColor Gray
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "All services stopped successfully." -ForegroundColor Green
