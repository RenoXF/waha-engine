import { useMemo } from 'react';
import { chatStore } from '../stores/chatStore';
import { contactStore } from '../stores/contactStore';

/** Shorten a raw JID for display: 6285163063603@s.whatsapp.net → 6285163063603 */
export function formatJid(jid: string): string {
  const base = jid.split('@')[0];
  return base.length > 15 ? `${base.slice(0, 12)}…` : base;
}

/** Best display name for a JID: chat list name → contact → group subject → short JID. */
export function resolveName(jid: string): string {
  const chat = chatStore.getState().chats.find((c) => c.chat_jid === jid);
  if (chat?.name && !chat.name.includes('@')) return chat.name;

  const contact = contactStore.getState().contacts.find((c) => c.jid === jid);
  const name = contact?.custom_name || contact?.push_name;
  if (name) return name;

  const group = contactStore.getState().groups.find((g) => g.group_jid === jid);
  if (group?.subject) return group.subject;

  return formatJid(jid);
}

/** Reactively resolved display name (subscribes to chat + contact stores). */
export function useDisplayName(jid: string | null): string {
  const chats = chatStore((s) => s.chats);
  const contacts = contactStore((s) => s.contacts);
  const groups = contactStore((s) => s.groups);
  return useMemo(() => (jid ? resolveName(jid) : ''), [jid, chats, contacts, groups]);
}
