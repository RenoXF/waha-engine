import { Elysia } from 'elysia';
import { SELF } from '@/auth';

// UI lama masih punya modal "User Management". Login sekarang satu password
// bersama, jadi endpoint ini hanya mengembalikan identitas tunggal itu.
// ponytail: kalau modal user dihapus dari UI, hapus file ini + route-nya.
const shared = { id: SELF.userId, username: SELF.username, role: SELF.role, is_active: true };

export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/', () => ({ success: true, data: [shared] }))
  .post('/', () => Response.json({ error: 'User management disabled — single shared login' }, { status: 400 }));
