#!/bin/bash
# WAHA Engine - pm2 wrapper
# Usage: ./start.sh [start|stop|restart|logs|status]

set -e
cd "$(cd "$(dirname "$0")" && pwd)"

# src/web/dist di-ignore git, jadi wajib build sebelum serve.
# API menyajikan halaman kosong kalau dist tidak ada.
if [ "$1" = "start" ] || [ "$1" = "restart" ] || [ $# -eq 0 ]; then
  echo "Building web..."
  (cd src/web && bun install --silent && bun run build)
fi

case "${1:-start}" in
  start)   pm2 start ecosystem.config.cjs ;;
  stop)    pm2 stop ecosystem.config.cjs ;;
  restart) pm2 restart ecosystem.config.cjs ;;
  logs)    pm2 logs ;;
  status)  pm2 status ;;
  *)       echo "Usage: $0 [start|stop|restart|logs|status]"; exit 1 ;;
esac
