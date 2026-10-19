const { dirname } = require('path');

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
      script: 'dist/main',
      interpreter: 'node',
      cwd: './src/engine/waha',
      env: { PATH: `${NODE_BIN}:${process.env.PATH}` },
      max_memory_restart: '500M',
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
