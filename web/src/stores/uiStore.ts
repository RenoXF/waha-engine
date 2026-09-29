import { create } from 'zustand';

export const uiStore = create<{
  activeModal: string | null;
  modalData: unknown;
  openModal: (name: string, data?: unknown) => void;
  closeModal: () => void;
}>((set) => ({
  activeModal: null,
  modalData: null,
  openModal: (name, data) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}));
