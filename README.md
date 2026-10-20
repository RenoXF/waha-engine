# waha-engine

WhatsApp Web client: WAHA (NOWEB) + Elysia (Bun) + PostgreSQL + React SPA.

```bash
bun install
cp .env.example .env          # edit DATABASE_URL + APP_PASSWORD
cd src/web && bun install && cd ../..
./start.sh                    # build web, install unit systemd, start
```

Detail konfigurasi WAHA: lihat `.env.example` dan `start.sh`.
