<#
.SYNOPSIS
    Verifies connectivity to the Redis cache and prints the Astra cache key schema.
.EXAMPLE
    .\scripts\redis-check.ps1
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path (Join-Path $root "api") ".env"

if (-not (Test-Path $envFile)) {
    Write-Error "api/.env not found at: $envFile"
    exit 1
}

# Parse REDIS_URL
$redisUrl = $null
foreach ($line in Get-Content $envFile) {
    if ($line -match "^REDIS_URL=(.+)$") {
        $redisUrl = $matches[1].Trim()
        break
    }
}

if (-not $redisUrl) {
    Write-Error "REDIS_URL not found in api/.env"
    exit 1
}

$display = $redisUrl -replace '://[^@]+@', '://***:***@'
Write-Host ""
Write-Host "REDIS_URL: $display" -ForegroundColor Cyan
Write-Host ""

# Run the Rust example from the api directory
Push-Location (Join-Path $root "api")
try {
    cargo run --example redis_check
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Redis check failed. Verify REDIS_URL in api/.env." -ForegroundColor Red
        exit 1
    }
}
finally {
    Pop-Location
}
