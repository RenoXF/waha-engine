import { create } from 'zustand';

export const uiStore = create<{
  activeModal: string | null;
  modalData: unknown;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  openModal: (name: string, data?: unknown) => void;
  closeModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}>((set) => ({
  activeModal: null,
  modalData: null,
  toast: null,
  openModal: (name, data) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));
