import { create } from 'zustand';

interface SyncState {
  sincronizando: boolean;
  progreso: number;
  pendientes: number;
  setSincronizando: (v: boolean) => void;
  setProgreso: (p: number) => void;
  setPendientes: (n: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  sincronizando: false,
  progreso: 0,
  pendientes: 0,
  setSincronizando: (v) => set({ sincronizando: v }),
  setProgreso: (p) => set({ progreso: p }),
  setPendientes: (n) => set({ pendientes: n }),
}));
