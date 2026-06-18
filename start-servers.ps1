# Fino - Start Backend and Frontend Servers
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fino - Starting Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing Node processes
Write-Host "🧹 Cleaning up existing Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Backend Server
Write-Host ""
Write-Host "🚀 Starting Backend Server (Port 5000)..." -ForegroundColor Green
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; `$env:NODE_ENV='development'; node server.js" -WindowStyle Normal

# Wait for backend to start
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Frontend Server
Write-Host ""
Write-Host "🎨 Starting Frontend Server (Port 3000)..." -ForegroundColor Green
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm start" -WindowStyle Normal

# Wait for frontend to start
Write-Host "⏳ Waiting for frontend to compile..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Servers Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Backend:  http://localhost:5000" -ForegroundColor Magenta
Write-Host "📍 Frontend: http://localhost:3000" -ForegroundColor Magenta
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Frontend will auto-open in your browser" -ForegroundColor White
Write-Host "   - Install Freighter wallet extension if not already installed" -ForegroundColor White
Write-Host "   - Set Freighter to Stellar TESTNET" -ForegroundColor White
Write-Host "   - Connect wallet from the navbar" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop servers: Close both PowerShell windows" -ForegroundColor Red
Write-Host ""
