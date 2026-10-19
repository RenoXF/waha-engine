import { config } from '@/config';

// Bacanya token dari cookie, dengan fallback query string HANYA di dev.
//
// Fallback itu perlu karena EventSource tidak bisa set header cross-origin, dan
// saat dev web jalan di 5173 sedangkan API di 4000. Di production keduanya
// same-origin (port 4000), jadi cookie selalu terkirim dan fallback tidak perlu.
//
// Di production fallback dimatikan karena ?token= menulis token ke access log
// proxy, browser history, dan header Referer request berikutnya — semua tempat
// yang cookie httpOnly tidak pernah masuk.
export function readToken(request: Request, cookieToken: unknown): string | null {
  if (typeof cookieToken === 'string' && cookieToken.length > 0) return cookieToken;
  if (config.nodeEnv === 'production') return null;
  return new URL(request.url).searchParams.get('token');
}
