export const config = {
  // Server
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/waha_engine',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'change-me-to-random-string',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',

  // WAHA
  wahaBaseUrl: process.env.WAHA_BASE_URL || 'http://localhost:3000',
  wahaApiKey: process.env.WAHA_API_KEY || '',
  wahaSessionName: process.env.WAHA_SESSION_NAME || 'default',

  // Webhook
  webhookHmacKey: process.env.WEBHOOK_HMAC_KEY || '',

  // Admin
  defaultAdminUsername: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
} as const;
