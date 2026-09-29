module.exports = {
  apps: [
    {
      name: 'waha',
      script: 'yarn',
      args: 'start',
      cwd: './waha',
      env: {
        WHATSAPP_DEFAULT_ENGINE: 'NOWEB',
        WHATSAPP_SESSIONS_POSTGRESQL_URL: 'postgres://postgres:postgres@localhost:5432/waha_engine',
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
      },
      max_memory_restart: '300M',
      autorestart: true,
    },
  ],
};
