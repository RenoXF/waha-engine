import { create } from 'zustand';

export const sessionStore = create<{
  state: string;
  qrCode: string | null;
  setState: (state: string) => void;
  setQrCode: (qr: string | null) => void;
}>((set) => ({
  state: 'UNKNOWN',
  qrCode: null,
  setState: (state) => set({ state }),
  setQrCode: (qr) => set({ qrCode: qr }),
}));
