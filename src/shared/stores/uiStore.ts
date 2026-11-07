import { create } from 'zustand';

export interface Toast {
  readonly id: string;
  readonly mensaje: string;
  readonly tipo: 'info' | 'exito' | 'error';
}

interface EstadoUi {
  readonly bloqueosActualizacion: Set<string>;
  readonly pendientes: number;
  readonly hayNuevaVersion: boolean;
  readonly toasts: readonly Toast[];
  readonly promptInstalacionDisponible: boolean;
  bloquearActualizacion(id: string): void;
  liberarActualizacion(id: string): void;
  setPendientes(valor: number): void;
  setHayNuevaVersion(valor: boolean): void;
  setPromptInstalacionDisponible(valor: boolean): void;
  agregarToast(toast: Omit<Toast, 'id'>): void;
  quitarToast(id: string): void;
}

export const useUiStore = create<EstadoUi>((set) => ({
  bloqueosActualizacion: new Set<string>(),
  pendientes: 0,
  hayNuevaVersion: false,
  toasts: [],
  promptInstalacionDisponible: false,
  bloquearActualizacion: (id) =>
    set((estado) => {
      const siguiente = new Set(estado.bloqueosActualizacion);
      siguiente.add(id);
      return { bloqueosActualizacion: siguiente };
    }),
  liberarActualizacion: (id) =>
    set((estado) => {
      const siguiente = new Set(estado.bloqueosActualizacion);
      siguiente.delete(id);
      return { bloqueosActualizacion: siguiente };
    }),
  setPendientes: (valor) => set({ pendientes: valor }),
  setHayNuevaVersion: (valor) => set({ hayNuevaVersion: valor }),
  setPromptInstalacionDisponible: (valor) => set({ promptInstalacionDisponible: valor }),
  agregarToast: (toast) =>
    set((estado) => ({
      toasts: [...estado.toasts, { ...toast, id: `${Date.now()}-${Math.random()}` }],
    })),
  quitarToast: (id) => set((estado) => ({ toasts: estado.toasts.filter((t) => t.id !== id) })),
}));
