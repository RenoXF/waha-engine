import { SignJWT, jwtVerify } from 'jose';
import { config } from '@/config';
import { getDb } from '@/db/client';
import type { JWTPayload } from 'jose';

export interface JwtUser {
  userId: string;
  username: string;
  role: string;
}

export interface TokenPayload extends JWTPayload {
  userId: string;
  username: string;
  role: string;
}

export async function createToken(user: JwtUser): Promise<string> {
  return new SignJWT({
    userId: user.userId,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiry)
    .sign(new TextEncoder().encode(config.jwtSecret));
}

export async function verifyToken(token: string): Promise<JwtUser | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(config.jwtSecret)
    );

    const db = getDb();
    const user = await db`
      SELECT id, username, role, is_active FROM app_users
      WHERE id = ${payload.userId}
      LIMIT 1
    `;

    if (user.length === 0 || !user[0].is_active) return null;

    return {
      userId: user[0].id,
      username: user[0].username,
      role: user[0].role,
    };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}
