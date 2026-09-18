# AIONOS Executive Productivity Agent — Windows Startup Script
# Run from the repository root with: .\start.ps1
#
# This script:
#   1. Installs backend dependencies (server/node_modules)
#   2. Installs frontend dependencies (Client/node_modules)
#   3. Starts the backend server in a new PowerShell window (port 3001)
#   4. Starts the Vite dev server in a new PowerShell window (port 5173)
#
# Prerequisites: Node.js 18+ and npm must be on PATH.

$root = $PSScriptRoot

Write-Host ""
Write-Host "=== AIONOS Executive Productivity Agent ===" -ForegroundColor Cyan
Write-Host ""

# ── Backend ──────────────────────────────────────────────────────────────────
$serverDir = Join-Path $root "server"

if (-not (Test-Path (Join-Path $serverDir "node_modules"))) {
    Write-Host "[1/4] Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location $serverDir
    npm install
    Pop-Location
} else {
    Write-Host "[1/4] Backend node_modules already present — skipping install." -ForegroundColor Green
}

# Copy .env.example to .env if .env does not exist
$envFile    = Join-Path $serverDir ".env"
$envExample = Join-Path $serverDir ".env.example"
if (-not (Test-Path $envFile)) {
    Write-Host "[2/4] Creating server/.env from .env.example..." -ForegroundColor Yellow
    Copy-Item $envExample $envFile
    Write-Host "      --> server/.env created. Add your API key there to enable LLM chat." -ForegroundColor DarkYellow
    Write-Host "      --> Without a key the chat still works via the deterministic fallback." -ForegroundColor DarkYellow
} else {
    Write-Host "[2/4] server/.env already exists — not overwriting." -ForegroundColor Green
}

# ── Frontend ─────────────────────────────────────────────────────────────────
$clientDir = Join-Path $root "Client"

if (-not (Test-Path (Join-Path $clientDir "node_modules"))) {
    Write-Host "[3/4] Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $clientDir
    npm install
    Pop-Location
} else {
    Write-Host "[3/4] Frontend node_modules already present — skipping install." -ForegroundColor Green
}

# ── Launch ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Starting backend and frontend in separate windows..." -ForegroundColor Cyan
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serverDir'; npm start"
Start-Sleep -Seconds 2   # Give backend a moment to bind before the browser opens

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$clientDir'; npm run dev"

Write-Host "Backend  -> http://localhost:3001/api/health" -ForegroundColor Green
Write-Host "Frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Both processes are running in separate windows." -ForegroundColor Cyan
Write-Host "Close those windows to stop the servers." -ForegroundColor Cyan
