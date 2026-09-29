import { closeDb } from './db/client';
import { logger } from './logger';

let shuttingDown = false;

export function registerShutdown(): void {
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[shutdown] ${signal} received, closing...`);
    try {
      await closeDb();
      process.exit(0);
    } catch (err) {
      logger.error(err, '[shutdown] Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}
