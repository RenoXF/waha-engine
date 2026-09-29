import { create } from 'zustand';
import { api } from '../api/client';

interface User {
  userId: string;
  username: string;
  role: string;
}

export const authStore = create<{
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}>((set) => ({
  user: null,
  loading: true,
  login: async (username, password) => {
    await api.login(username, password);
    const { data } = await api.me() as { data: User };
    set({ user: data });
  },
  logout: async () => {
    await api.logout();
    set({ user: null });
  },
  checkAuth: async () => {
    try {
      const { data } = await api.me() as { data: User };
      set({ user: data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
