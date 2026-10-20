import { createHash, timingSafeEqual } from 'crypto';
import { config } from '@/config';

// Cookie menyimpan digest, bukan password mentah. Password tidak pernah
// dikirim balik ke browser setelah login.
const TOKEN = createHash('sha256').update(config.appPassword).digest('hex');

// Identitas tunggal — UI masih menampilkan username/role, isinya statis.
export const SELF = { userId: 'shared', username: 'admin', role: 'admin' } as const;

export function passwordMatches(input: unknown): boolean {
  if (typeof input !== 'string' || input.length === 0) return false;
  const a = createHash('sha256').update(input).digest();
  const b = Buffer.from(TOKEN, 'hex');
  return timingSafeEqual(a, b);
}

export function tokenIsValid(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== TOKEN.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(TOKEN));
}

export function sessionToken(): string {
  return TOKEN;
}
