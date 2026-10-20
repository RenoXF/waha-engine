#!/bin/bash
# WAHA Engine — start/stop lewat systemd.
#
#   ./start.sh            build web kalau perlu, install unit, lalu start
#   ./start.sh restart    restart service
#   ./start.sh stop       stop service
#   ./start.sh logs       ikuti log gabungan (Ctrl-C keluar)
#   ./start.sh status     status service
#   ./start.sh build      paksa build web
#
# Setup awal (sekali seumur server):
#   git submodule update --init --recursive
#   bun install && (cd src/web && bun install)
#   cp .env.example .env && edit .env + src/engine/waha/.env
#   ./start.sh

set -e
cd "$(cd "$(dirname "$0")" && pwd)"
ROOT=$(pwd)
UNITS="waha waha-api"

build_web() {
  echo "Building web..."
  (cd src/web && bun run build)
}

# src/web/dist di-ignore git, jadi wajib ada sebelum API serve.
web_stale() {
  [ ! -f src/web/dist/index.html ] && return 0
  [ -n "$(find src/web/src src/web/index.html src/web/vite.config.ts -newer src/web/dist/index.html 2>/dev/null)" ]
}

install_units() {
  local node bun changed=0
  node=$(command -v node)
  bun=$(command -v bun)
  # Jangan tulis unit setengah jadi kalau PATH belum memuat node/bun (mis. nvm
  # belum di-source) — systemd butuh path absolut.
  : "${node:?node tidak ada di PATH; source nvm dulu}"
  : "${bun:?bun tidak ada di PATH}"
  for u in $UNITS; do
    local tmp; tmp=$(mktemp)
    sed -e "s|__ROOT__|$ROOT|g" -e "s|__USER__|$(id -un)|g" \
        -e "s|__NODE__|$node|g" -e "s|__BUN__|$bun|g" "deploy/$u.service" > "$tmp"
    if ! cmp -s "$tmp" "/etc/systemd/system/$u.service"; then
      sudo cp "$tmp" "/etc/systemd/system/$u.service"
      changed=1
    fi
    rm -f "$tmp"
  done
  [ "$changed" = 1 ] && sudo systemctl daemon-reload
  return 0
}

case "${1:-start}" in
  start)
    web_stale && build_web
    install_units
    sudo systemctl enable --now $UNITS
    sudo systemctl restart waha-api
    ;;
  build)   build_web ;;
  stop)    sudo systemctl stop $UNITS ;;
  restart) sudo systemctl restart $UNITS ;;
  logs)    journalctl -u waha -u waha-api -f -o cat ;;
  status)  systemctl status $UNITS --no-pager ;;
  *)       echo "Usage: $0 [start|build|stop|restart|logs|status]"; exit 1 ;;
esac
