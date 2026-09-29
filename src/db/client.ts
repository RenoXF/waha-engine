import postgres from 'postgres';
import { config } from '@/config';

let sql: postgres.Sql | null = null;

export function getDb(): postgres.Sql {
  if (!sql) {
    sql = postgres(config.databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

export async function dbReady(retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const db = getDb();
      await db`SELECT 1`;
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}
