#!/usr/bin/env bash
# ========================================
#   Fino Local Development Server
#   Blockchain: Stellar (Testnet)
# ========================================

set -e

echo ""
echo "========================================"
echo "  Fino Local Development Server"
echo "  Blockchain: Stellar (Testnet)"
echo "========================================"
echo ""

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Dependency checks ─────────────────────
if ! command -v node &>/dev/null; then
  echo "❌  Node.js is not installed. Please install it from https://nodejs.org"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "❌  npm is not installed. Please install Node.js from https://nodejs.org"
  exit 1
fi

# ── Backend ───────────────────────────────
echo "[1/2] Starting Backend API on port 5000..."
node backend/server.js &
BACKEND_PID=$!
echo "      Backend PID: $BACKEND_PID"

# Give the backend a moment to bind the port
sleep 3

# Quick health check
if curl -sf http://localhost:5000/api/health >/dev/null 2>&1; then
  echo "      ✅  Backend is healthy at http://localhost:5000"
else
  echo "      ⏳  Backend still starting (MongoDB may be connecting)..."
fi

# ── Frontend ──────────────────────────────
echo ""
echo "[2/2] Starting Frontend React App on port 3000..."
cd frontend
npm start &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"
echo "      Frontend PID: $FRONTEND_PID"

# ── Summary ───────────────────────────────
echo ""
echo "========================================"
echo "  🚀  Both servers are running!"
echo "========================================"
echo ""
echo "  Backend  ->  http://localhost:5000"
echo "  Frontend ->  http://localhost:3000"
echo "  Health   ->  http://localhost:5000/api/health"
echo ""
echo "  Wallet : Install Freighter browser extension"
echo "  Network: Set Freighter to TESTNET"
echo "  Explorer: https://stellar.expert/explorer/testnet"
echo ""
echo "========================================"
echo "  Press Ctrl+C to stop both servers"
echo "========================================"
echo ""

# ── Graceful shutdown ─────────────────────
cleanup() {
  echo ""
  echo "Shutting down servers..."
  kill "$BACKEND_PID"  2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  echo "Done. Goodbye!"
  exit 0
}

trap cleanup INT TERM

# Wait for both background processes
wait
