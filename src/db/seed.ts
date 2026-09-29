import { getDb } from './client';
import { config } from '@/config';

export async function seed(): Promise<void> {
  const db = getDb();

  const existing = await db`
    SELECT id FROM app_users
    WHERE username = ${config.defaultAdminUsername}
    LIMIT 1
  `;

  if (existing.length > 0) return;

  const hash = await Bun.password.hash(config.defaultAdminPassword);

  await db`
    INSERT INTO app_users (username, password_hash, role)
    VALUES (${config.defaultAdminUsername}, ${hash}, 'admin')
  `;

  console.log(`[seed] Created admin user: ${config.defaultAdminUsername}`);
}
