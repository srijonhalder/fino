@echo off
echo ========================================
echo   Fino Local Development Server
echo   Blockchain: Stellar (Testnet)
echo ========================================
echo.

echo [1/2] Starting Backend API (port 5000)...
start "Fino Backend - Stellar" cmd /k "node backend/server.js"

echo [2/2] Starting Frontend React App (port 3000)...
start "Fino Frontend - Stellar" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo   Both servers are starting up!
echo ========================================
echo.
echo   Backend  -^>  http://localhost:5000
echo   Frontend -^>  http://localhost:3000
echo   Health   -^>  http://localhost:5000/api/health
echo.
echo   Wallet: Install Freighter extension
echo   Network: Set Freighter to TESTNET
echo   Explorer: https://stellar.expert/explorer/testnet
echo ========================================
echo.
echo Both windows will open shortly. Close this window after they appear.
pause
