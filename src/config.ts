import { load } from 'bun';

const env = load();

export const config = {
  // Server
  port: Number(env.PORT || 4000),
  host: env.HOST || '0.0.0.0',

  // Database
  databaseUrl: env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/waha_engine',

  // JWT
  jwtSecret: env.JWT_SECRET || 'change-me-to-random-string',
  jwtExpiry: env.JWT_EXPIRY || '7d',

  // WAHA
  wahaBaseUrl: env.WAHA_BASE_URL || 'http://localhost:3000',
  wahaApiKey: env.WAHA_API_KEY || '',
  wahaSessionName: env.WAHA_SESSION_NAME || 'default',

  // Webhook
  webhookHmacKey: env.WEBHOOK_HMAC_KEY || '',

  // Admin
  defaultAdminUsername: env.DEFAULT_ADMIN_USERNAME || 'admin',
  defaultAdminPassword: env.DEFAULT_ADMIN_PASSWORD || 'admin123',
} as const;
