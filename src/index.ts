import { config } from '@/config';
import { dbReady } from '@/db/client';
import { migrate } from '@/db/migrate';
import { registerShutdown } from '@/shutdown';
import { logger } from '@/logger';
import { syncFromWaha } from '@/waha/sync';

async function main() {
  logger.info('[boot] Starting WAHA Engine...');

  registerShutdown();

  logger.info('[boot] Connecting to database...');
  await dbReady();
  logger.info('[boot] ✓ Database connected');

  logger.info('[boot] Running migrations...');
  await migrate();
  logger.info('[boot] ✓ Migrations complete');

  const { createServer } = await import('@/server');
  createServer();
  logger.info(`[boot] ✓ Server running at http://${config.host}:${config.port}`);

  // Sync history sekali saat boot. Kalau session WAHA belum WORKING (mis. baru
  // pairing), ulangi tiap 30 detik sampai berhasil. Setelah itu webhook
  // session.status yang memicu sync berikutnya.
  // ponytail: maks 20 percobaan lalu berhenti. Kalau butuh sync berkala
  // terus-menerus, hidupkan lagi cron — jangan tambah loop baru.
  let attempts = 0;
  const tick = async () => {
    const ok = await syncFromWaha().catch((e) => {
      logger.error(e, '[boot] Initial sync failed');
      return false;
    });
    if (ok || ++attempts >= 20) clearInterval(timer);
  };
  const timer = setInterval(tick, 30_000);
  void tick();
}

main().catch((err) => {
  logger.fatal(err, '[boot] Fatal error');
  process.exit(1);
});
