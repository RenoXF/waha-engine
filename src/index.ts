import { config } from '@/config';
import { dbReady } from '@/db/client';
import { migrate } from '@/db/migrate';
import { seed } from '@/db/seed';
import { registerShutdown } from '@/shutdown';
import { logger } from '@/logger';
import { Cron } from 'croner';
import { syncFromWaha } from '@/waha/sync';

async function main() {
  logger.info('[boot] Starting WAHA Engine...');

  // 1. Register shutdown handlers
  registerShutdown();

  // 2. Wait for database
  logger.info('[boot] Connecting to database...');
  await dbReady();
  logger.info('[boot] ✓ Database connected');

  // 3. Run migrations
  logger.info('[boot] Running migrations...');
  await migrate();
  logger.info('[boot] ✓ Migrations complete');

  // 4. Seed default admin
  await seed();

  // 5. Start server
  const { createServer } = await import('@/server');
  const server = createServer();

  server.listen({ port: config.port, hostname: config.host }, () => {
    logger.info(`[boot] ✓ Server running at http://${config.host}:${config.port}`);
  });

  // 6. Periodic sync every 5 minutes (contacts, LID mapping, chats)
  new Cron('*/5 * * * *', async () => {
    try {
      await syncFromWaha();
      logger.info('[cron] Periodic sync complete');
    } catch (e) {
      logger.error(e, '[cron] Periodic sync failed');
    }
  });
  logger.info('[boot] ✓ Periodic sync scheduled (every 5 min)');
}

main().catch((err) => {
  logger.fatal(err, '[boot] Fatal error');
  process.exit(1);
});
