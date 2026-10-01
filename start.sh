#!/bin/bash
# WAHA Engine - Start all services
# Usage: ./start.sh [waha|api|web|all]

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
NVM_DIR="$HOME/.nvm"
NODE_BIN="/home/iamraf/.nvm/versions/node/v24.15.0/bin"

start_waha() {
  echo "Starting WAHA (port 3000)..."
  cd "$DIR/waha"
  source "$NVM_DIR/nvm.sh" && nvm use 24
  WHATSAPP_DEFAULT_ENGINE=NOWEB \
  WHATSAPP_API_KEY=8c70763260f317805ea8a8800acae38d1caa4ffc2a6665c66460ef256637a5bf \
  WHATSAPP_SESSIONS_POSTGRESQL_URL=postgres://iamraf:3302@localhost:5432/waha_engine \
  WHATSAPP_WEBHOOK_URL=http://localhost:4000/webhook \
  WHATSAPP_WEBHOOK_HMAC_KEY=2f8b5c4eeba0052d74fba33afc9a174cfc839119acc8e65a4094c542eb222f4e \
  PUPPETEER_SKIP_DOWNLOAD=true \
  "$NODE_BIN/node" -r tsconfig-paths/register --experimental-specifier-resolution=node \
    node_modules/.bin/ts-node --transpile-only src/main.ts &
  echo "WAHA started (PID: $!)"
}

start_api() {
  echo "Starting API (port 4000)..."
  cd "$DIR"
  PORT=4000 bun run src/index.ts &
  echo "API started (PID: $!)"
}

start_web() {
  echo "Starting Frontend (port 5173)..."
  cd "$DIR/web"
  bun run dev &
  echo "Frontend started (PID: $!)"
}

case "${1:-all}" in
  waha) start_waha ;;
  api)  start_api ;;
  web)  start_web ;;
  all)
    start_waha
    sleep 3
    start_api
    sleep 2
    start_web
    echo ""
    echo "═══════════════════════════════════════"
    echo "  WAHA Engine"
    echo "  WAHA:     http://localhost:3000"
    echo "  API:      http://localhost:4000"
    echo "  Frontend: http://localhost:5173"
    echo "  Login:    admin / admin123"
    echo "═══════════════════════════════════════"
    echo ""
    echo "Press Ctrl+C to stop all..."
    wait
    ;;
  *) echo "Usage: $0 [waha|api|web|all]"; exit 1 ;;
esac
