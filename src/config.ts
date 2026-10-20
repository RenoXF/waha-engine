export const config = {
  // Server
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',

  // Single-VM, single shared login. Ganti lewat .env kalau perlu.
  appPassword: process.env.APP_PASSWORD || 'change-me',

  // Database. Kredensial asli ada di .env (gitignored), jangan di source.
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/waha_engine',

  // WAHA. localhost only, tanpa API key (WAHA_NO_API_KEY=true di waha/.env).
  wahaBaseUrl: process.env.WAHA_BASE_URL || 'http://localhost:3000',
  wahaSessionName: process.env.WAHA_SESSION_NAME || 'default',
} as const;
