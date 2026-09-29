import { readdir } from 'fs/promises';
import { join } from 'path';
import { getDb } from './client';

const MIGRATIONS_DIR = join(import.meta.dir, 'migrations');

export async function migrate(): Promise<void> {
  const db = getDb();

  // Create migration tracking table
  await db`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  // Get applied migrations
  const applied = await db`SELECT version FROM schema_migrations ORDER BY version`;
  const appliedSet = new Set(applied.map(r => r.version));

  // Read migration files
  const files = (await readdir(MIGRATIONS_DIR))
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = file.replace('.sql', '');
    if (appliedSet.has(version)) continue;

    console.log(`[migrate] Running ${version}...`);
    const sql = await Bun.file(join(MIGRATIONS_DIR, file)).text();

    await db.begin(async (tx) => {
      await tx.unsafe(sql);
      await tx`INSERT INTO schema_migrations (version) VALUES (${version})`;
    });

    console.log(`[migrate] ✓ ${version}`);
  }
}
