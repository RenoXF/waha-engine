#!/bin/bash
# WAHA Engine - pm2 wrapper
#
#   ./start.sh            build web kalau perlu, lalu pm2 start
#   ./start.sh build      paksa build web
#   ./start.sh stop | restart | logs | status
#
# Setup awal (sekali seumur server):
#   git submodule update --init --recursive
#   bun install && (cd src/web && bun install)
#   cp .env.example .env && edit .env + src/engine/waha/.env
#   npm i -g pm2 && pm2 startup

set -e
cd "$(cd "$(dirname "$0")" && pwd)"

build_web() {
  echo "Building web..."
  (cd src/web && bun run build)
}

# src/web/dist di-ignore git, jadi wajib ada sebelum API serve.
# Tidak rebuild tiap restart: cukup kalau hilang atau ada sumber lebih baru.
web_stale() {
  [ ! -f src/web/dist/index.html ] && return 0
  [ -n "$(find src/web/src src/web/index.html src/web/vite.config.ts -newer src/web/dist/index.html 2>/dev/null)" ]
}

case "${1:-start}" in
  start)
    web_stale && build_web
    pm2 start ecosystem.config.cjs
    ;;
  build)   build_web ;;
  stop)    pm2 stop ecosystem.config.cjs ;;
  restart) pm2 restart ecosystem.config.cjs ;;
  logs)    pm2 logs ;;
  status)  pm2 status ;;
  *)       echo "Usage: $0 [start|build|stop|restart|logs|status]"; exit 1 ;;
esac
