import { logger } from '@/logger';

export interface SseEvent {
  id: number;
  type: string;
  data: unknown;
}

type Subscriber = (event: SseEvent) => void;

const subscribers = new Set<Subscriber>();
const buffer: SseEvent[] = [];
const BUFFER_SIZE = 1000;
let eventId = 0;

export function ssePush(type: string, data: unknown): void {
  const event: SseEvent = { id: ++eventId, type, data };
  buffer.push(event);
  if (buffer.length > BUFFER_SIZE) buffer.shift();

  for (const sub of subscribers) {
    try {
      sub(event);
    } catch {
      subscribers.delete(sub);
    }
  }
}

export function subscribeSse(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

export function getBufferedEvents(sinceId: number): SseEvent[] {
  return buffer.filter(e => e.id > sinceId);
}
