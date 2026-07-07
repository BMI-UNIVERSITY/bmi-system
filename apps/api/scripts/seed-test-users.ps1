#!/usr/bin/env pwsh
# seed-test-users.ps1
# Creates 200 verified test users in the local D1 for k6 load testing.
# Run this ONCE before executing load-test.js.
#
# Usage: .\seed-test-users.ps1

$API_BASE   = "http://127.0.0.1:8787"
$USER_COUNT = 200
$PASSWORD   = "LoadTest@1234"
$OUTPUT     = "$PSScriptRoot\test-users.json"

Write-Host "Seeding $USER_COUNT verified test users..." -ForegroundColor Cyan
$users = @()

for ($i = 1; $i -le $USER_COUNT; $i++) {
    $email = "loadtest-user-$i@example.com"
    $body  = @{
        email      = $email
        password   = $PASSWORD
        first_name = "Load"
        last_name  = "User$i"
    } | ConvertTo-Json

    try {
        $res = Invoke-WebRequest -Uri "$API_BASE/api/auth/register" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -ErrorAction SilentlyContinue
    } catch {
        $res = $null
    }

    # Add to list regardless (user may already exist from previous run)
    $users += [PSCustomObject]@{ email = $email; password = $PASSWORD }

    if ($i % 20 -eq 0) {
        Write-Host "  Registered $i / $USER_COUNT users" -ForegroundColor Gray
    }
}

# Bulk-verify all test users via wrangler D1 execute
Write-Host "Verifying all test users in local D1..." -ForegroundColor Yellow
$sql = "UPDATE users SET is_verified = 1 WHERE email LIKE 'loadtest-user-%@example.com';"
& npx wrangler d1 execute bmi-portal-db --local --command $sql 2>&1 | Out-Null

# Write fixture file for k6
$users | ConvertTo-Json | Set-Content -Path $OUTPUT -Encoding UTF8
Write-Host "Credentials written to: $OUTPUT" -ForegroundColor Green
Write-Host ""
Write-Host "Ready! Run the load test with:" -ForegroundColor Magenta
Write-Host "  .\k6-v0.49.0-windows-amd64\k6.exe run load-test.js" -ForegroundColor White
