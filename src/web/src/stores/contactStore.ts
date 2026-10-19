import { create } from 'zustand';
import { api } from '../api/client';

export interface Contact {
  jid: string;
  phone: string | null;
  push_name: string | null;
  custom_name: string | null;
  is_business: boolean;
  avatar_path: string | null;
  about: string | null;
  last_seen_at: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
}

export interface Group {
  group_jid: string;
  subject: string | null;
  description: string | null;
  owner_jid: string | null;
  avatar_path: string | null;
  participant_count: number;
}

export const contactStore = create<{
  contacts: Contact[];
  groups: Group[];
  loading: boolean;
  loadContacts: () => Promise<void>;
  loadGroups: () => Promise<void>;
}>((set) => ({
  contacts: [],
  groups: [],
  loading: false,

  loadContacts: async () => {
    set({ loading: true });
    const { data } = await api.getContacts() as { data: Contact[] };
    set({ contacts: data, loading: false });
  },

  loadGroups: async () => {
    const { data } = await api.getGroups() as { data: Group[] };
    set({ groups: data });
  },
}));
