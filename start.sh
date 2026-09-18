#!/usr/bin/env bash
# AIONOS Executive Productivity Agent — macOS / Linux Startup Script
# Run from the repository root with: bash start.sh
#
# This script:
#   1. Installs backend dependencies  (server/node_modules)
#   2. Installs frontend dependencies (Client/node_modules)
#   3. Creates server/.env from .env.example if it does not exist
#   4. Starts both servers in background processes
#
# Prerequisites: Node.js 18+ and npm must be on PATH.

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "=== AIONOS Executive Productivity Agent ==="
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
SERVER_DIR="$ROOT/server"

if [ ! -d "$SERVER_DIR/node_modules" ]; then
    echo "[1/4] Installing backend dependencies..."
    (cd "$SERVER_DIR" && npm install)
else
    echo "[1/4] Backend node_modules present — skipping install."
fi

ENV_FILE="$SERVER_DIR/.env"
ENV_EXAMPLE="$SERVER_DIR/.env.example"
if [ ! -f "$ENV_FILE" ]; then
    echo "[2/4] Creating server/.env from .env.example..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "      --> server/.env created. Add your API key to enable LLM chat."
    echo "      --> Without a key the chat still works via the deterministic fallback."
else
    echo "[2/4] server/.env already exists — not overwriting."
fi

# ── Frontend ─────────────────────────────────────────────────────────────────
CLIENT_DIR="$ROOT/Client"

if [ ! -d "$CLIENT_DIR/node_modules" ]; then
    echo "[3/4] Installing frontend dependencies..."
    (cd "$CLIENT_DIR" && npm install)
else
    echo "[3/4] Frontend node_modules present — skipping install."
fi

# ── Launch ───────────────────────────────────────────────────────────────────
echo ""
echo "[4/4] Starting backend and frontend..."
echo ""

(cd "$SERVER_DIR" && npm start) &
BACKEND_PID=$!
sleep 2

(cd "$CLIENT_DIR" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Backend  -> http://localhost:3001/api/health  (PID $BACKEND_PID)"
echo "Frontend -> http://localhost:5173              (PID $FRONTEND_PID)"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for both; kill both on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'" INT TERM
wait $BACKEND_PID $FRONTEND_PID
