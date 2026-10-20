import { expect, test } from 'bun:test';
import { chatStore, type Message } from './chatStore';

const m = (id: string, status = 'pending') => ({ id, chat_jid: 'c', status } as unknown as Message);

test('reconcileMessage: rename temp kalau id asli belum ada', () => {
  chatStore.setState({ currentChat: 'c', messages: [m('tmp')] });
  chatStore.getState().reconcileMessage('tmp', 'real');
  expect(chatStore.getState().messages.map((x) => x.id)).toEqual(['real']);
  expect(chatStore.getState().messages[0]!.status).toBe('sent');
});

test('reconcileMessage: buang temp kalau SSE sudah menambah id asli', () => {
  chatStore.setState({ currentChat: 'c', messages: [m('tmp'), m('real', 'sent')] });
  chatStore.getState().reconcileMessage('tmp', 'real');
  expect(chatStore.getState().messages.map((x) => x.id)).toEqual(['real']);
});
