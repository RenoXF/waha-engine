// Rate limiter login, in-memory.
// 5 kegagalan per 15 menit per username.
//
// Dikunci per username, bukan per IP: semua cabang kantor datang lewat satu
// egress, jadi limit per-IP membuat 5 salah ketik mengunci 3 kantor sekaligus.
//
// ponytail: in-memory, hilang saat restart. Kalau nanti auth-nya jadi multi-user
// sungguhan, ganti ke Postgres/Redis — satu proses API sekarang masih cukup.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Hapus entri kedaluwarsa supaya Map tidak tumbuh tanpa batas.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

// Cek tanpa menambah counter. Panggil sebelum verifikasi password.
export function checkRateLimit(key: string): { ok: boolean; retryAfterMs: number } {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.resetAt) return { ok: true, retryAfterMs: 0 };
  if (entry.count >= MAX_ATTEMPTS) return { ok: false, retryAfterMs: entry.resetAt - Date.now() };
  return { ok: true, retryAfterMs: 0 };
}

// Panggil hanya saat verifikasi gagal. Login yang berhasil tidak dihitung,
// kalau tidak 5 login succesful mengunci user selama 15 menit.
export function recordFailure(key: string): void {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count++;
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}
