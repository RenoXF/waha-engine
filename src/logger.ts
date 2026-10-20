import pino from 'pino';
import { getDb } from '@/db/client';

const pinoLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

function safeJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Normalisasi argumen pino (msg | err, msg | obj) jadi kolom app_logs. */
function toRecord(args: unknown[]): { message: string; detail: string | null } {
  const [first, second] = args;
  if (first instanceof Error) {
    const label = typeof second === 'string' ? second : first.message;
    return { message: label, detail: first.stack ?? first.message };
  }
  if (typeof first === 'string') {
    return { message: first, detail: args.length > 1 ? safeJson(second) : null };
  }
  return {
    message: typeof second === 'string' ? second : safeJson(first) ?? '(no message)',
    detail: safeJson(first),
  };
}

// Fire-and-forget: logging tidak boleh memperlambat atau menggagalkan request.
// Kalau DB sedang down, error-nya ditelan — kalau tidak, logger memanggil
// dirinya sendiri tanpa henti.
function writeToDb(level: string, args: unknown[]): void {
  // Test berjalan di DB yang sama dengan aplikasi (DB-backed test); jangan
  // kotori app_logs dengan kegagalan media palsu dari fixture.
  if (process.env.NODE_ENV === 'test') return;
  const { message, detail } = toRecord(args);
  void getDb()`
    INSERT INTO app_logs (level, message, detail)
    VALUES (${level}, ${message.slice(0, 2000)}, ${detail?.slice(0, 8000) ?? null})
  `.catch(() => {});
}

// warn/error/fatal masuk DB. info/debug cuma console — kalau semua ikut,
// app_logs jadi banjir dan error asli tenggelam.
export const logger = {
  debug: (...args: unknown[]) => pinoLogger.debug(args[0] as never, args[1] as never),
  info: (...args: unknown[]) => pinoLogger.info(args[0] as never, args[1] as never),
  warn: (...args: unknown[]) => {
    pinoLogger.warn(args[0] as never, args[1] as never);
    writeToDb('warn', args);
  },
  error: (...args: unknown[]) => {
    pinoLogger.error(args[0] as never, args[1] as never);
    writeToDb('error', args);
  },
  fatal: (...args: unknown[]) => {
    pinoLogger.fatal(args[0] as never, args[1] as never);
    writeToDb('fatal', args);
  },
  flush: () => pinoLogger.flush(),
};
