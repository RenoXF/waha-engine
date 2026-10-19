import { create } from 'zustand';
import { api } from '../api/client';
import { uiStore } from './uiStore';

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
  quoted_body?: string | null;
  quoted_from_me?: boolean | null;
  quoted_from_jid?: string | null;
  quoted_type?: string | null;
  quoted_deleted?: boolean | null;
  forwarded: boolean;
  is_starred: boolean;
  has_media: boolean;
  media_path: string | null;
  media_mime: string | null;
  media_url: string | null;
  media_filename: string | null;
  media_size?: number | null;
  is_edited: boolean;
  is_deleted: boolean;
  status?: string | null;
  pending_at?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
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
  loadingMore: boolean;
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
}>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  loading: false,
  loadingMore: false,

  loadChats: async () => {
    try {
      const { data } = await api.getChats() as { data: Chat[] };
      set({ chats: data });
    } catch {
      // keep previous list; SSE will retry on next event
    }
  },

  selectChat: async (jid) => {
    set({ currentChat: jid, messages: [], loading: true });
    try {
      const { data } = await api.getMessages(jid) as { data: Message[] };
      if (get().currentChat !== jid) return; // user switched away
      set({ messages: data, loading: false });
      api.markRead(jid).catch(() => {});
    } catch {
      if (get().currentChat !== jid) return;
      set({ loading: false });
      uiStore.getState().showToast('Failed to load messages', 'error');
    }
  },

  clearChat: () => set({ currentChat: null, messages: [], loading: false }),

  loadMore: async () => {
    const { currentChat, messages, loadingMore } = get();
    if (!currentChat || messages.length === 0 || loadingMore) return;
    const oldest = messages[0];
    set({ loadingMore: true });
    try {
      const { data } = await api.getMessages(currentChat, 50, oldest.wa_timestamp, oldest.id) as { data: Message[] };
      if (data.length > 0 && get().currentChat === currentChat) {
        set({ messages: [...data, ...get().messages] });
      }
    } catch {
      // scroll retry happens on next startReached
    } finally {
      set({ loadingMore: false });
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
