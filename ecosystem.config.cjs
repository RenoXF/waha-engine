const { dirname, join } = require('path');

const ROOT = __dirname;
const NODE_BIN = dirname(process.execPath);

module.exports = {
  apps: [
    {
      name: 'waha',
      // --env-file wajib: WAHA construct AuthConfig saat import, sebelum
      // NestJS ConfigModule memuat .env. Tanpa itu WAHA_API_KEY diabaikan
      // dan semua endpoint balas 401.
      node_args: '--env-file=.env',
      // pm2 resolve script relatif ke cwd proses pm2, bukan cwd app.
      script: join(ROOT, 'src/engine/waha/dist/main.js'),
      interpreter: 'node',
      cwd: './src/engine/waha',
      env: { PATH: `${NODE_BIN}:${process.env.PATH}` },
      // WAHA + session WA consuming ~600MB. Batas 500M bikin pm2 restart-loop
      // tiap beberapa menit -> session WhatsApp putus-nyambung.
      max_memory_restart: '1G',
      autorestart: true,
    },
    {
      name: 'api',
      script: 'bun',
      args: 'run src/index.ts',
      cwd: '.',
      // Bun baca .env root otomatis, jadi PORT/DATABASE_URL/WAHA_API_KEY
      // diambil dari sana. Jangan hardcode secret di file ini.
      max_memory_restart: '300M',
      autorestart: true,
    },
  ],
};
