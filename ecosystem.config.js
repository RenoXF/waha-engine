const { execSync } = require('child_process');
const NODE_PATH = '/home/iamraf/.nvm/versions/node/v24.15.0/bin';

module.exports = {
  apps: [
    {
      name: 'waha',
      script: `${NODE_PATH}/node`,
      args: '-r tsconfig-paths/register --experimental-specifier-resolution=node node_modules/.bin/ts-node --transpile-only src/main.ts',
      cwd: './waha',
      env: {
        PATH: `${NODE_PATH}:${process.env.PATH}`,
        WHATSAPP_DEFAULT_ENGINE: 'NOWEB',
        WHATSAPP_API_KEY: '8c70763260f317805ea8a8800acae38d1caa4ffc2a6665c66460ef256637a5bf',
        WAHA_DASHBOARD_USERNAME: 'admin',
        WAHA_DASHBOARD_PASSWORD: '1bafa22f5bd44821bc3716a4352a221a',
        WHATSAPP_SWAGGER_USERNAME: 'admin',
        WHATSAPP_SWAGGER_PASSWORD: '1bafa22f5bd44821bc3716a4352a221a',
        WHATSAPP_SESSIONS_POSTGRESQL_URL: 'postgres://iamraf:3302@localhost:5432/waha_engine',
        WHATSAPP_WEBHOOK_URL: 'http://localhost:4000/webhook',
        WHATSAPP_WEBHOOK_HMAC_KEY: '2f8b5c4eeba0052d74fba33afc9a174cfc839119acc8e65a4094c542eb222f4e',
        PUPPETEER_SKIP_DOWNLOAD: 'true',
      },
      max_memory_restart: '500M',
      autorestart: true,
    },
    {
      name: 'api',
      script: 'bun',
      args: 'run src/index.ts',
      cwd: '.',
      env: {
        PORT: 4000,
        DATABASE_URL: 'postgres://iamraf:3302@localhost:5432/waha_engine',
        WAHA_BASE_URL: 'http://localhost:3000',
        WAHA_API_KEY: '8c70763260f317805ea8a8800acae38d1caa4ffc2a6665c66460ef256637a5bf',
        WEBHOOK_HMAC_KEY: '2f8b5c4eeba0052d74fba33afc9a174cfc839119acc8e65a4094c542eb222f4e',
      },
      max_memory_restart: '300M',
      autorestart: true,
    },
  ],
};
