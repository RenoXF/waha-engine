import { create } from 'zustand';
import { api } from '../api/client';

export interface Chat {
  chat_jid: string;
  chat_type: string;
  name: string | null;
  last_message_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
  is_archived: boolean;
}

export interface Message {
  id: string;
  chat_jid: string;
  from_jid: string | null;
  from_me: boolean;
  participant: string | null;
  message_type: string;
  body: string | null;
  quoted_id: string | null;
  forwarded: boolean;
  is_starred: boolean;
  has_media: boolean;
  media_path: string | null;
  media_mime: string | null;
  media_url: string | null;
  media_filename: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  wa_timestamp: string;
  created_at: string;
}

export const chatStore = create<{
  chats: Chat[];
  currentChat: string | null;
  messages: Message[];
  loading: boolean;
  loadChats: () => Promise<void>;
  selectChat: (jid: string) => Promise<void>;
  clearChat: () => void;
  loadMore: () => Promise<void>;
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
}>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  loading: false,

  loadChats: async () => {
    const { data } = await api.getChats() as { data: Chat[] };
    set({ chats: data });
  },

  selectChat: async (jid) => {
    set({ currentChat: jid, messages: [], loading: true });
    const { data } = await api.getMessages(jid) as { data: Message[] };
    set({ messages: data, loading: false });
    api.markRead(jid).catch(() => {});
  },

  clearChat: () => set({ currentChat: null, messages: [], loading: false }),

  loadMore: async () => {
    const { currentChat, messages } = get();
    if (!currentChat || messages.length === 0) return;
    const oldest = messages[0];
    const { data } = await api.getMessages(currentChat, 50, oldest.wa_timestamp, oldest.id) as { data: Message[] };
    if (data.length > 0) {
      set({ messages: [...data, ...messages] });
    }
  },

  addMessage: (msg) => set((s) => {
    if (s.currentChat === msg.chat_jid) {
      if (s.messages.some(m => m.id === msg.id)) return s;
      return { messages: [...s.messages, msg] };
    }
    return s;
  }),

  updateMessage: (id, updates) => set((s) => ({
    messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m),
  })),

  removeMessage: (id) => set((s) => ({
    messages: s.messages.filter(m => m.id !== id),
  })),
}));
