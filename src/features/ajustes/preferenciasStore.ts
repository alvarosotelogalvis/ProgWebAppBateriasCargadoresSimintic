import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { aplicarEscalaFuente, type EscalaFuente } from '@/app/escalaFuente';

interface EstadoPreferencias {
  readonly escalaFuente: EscalaFuente;
  readonly bannerInstalarDescartado: boolean;
  setEscalaFuente(escala: EscalaFuente): void;
  descartarBannerInstalar(): void;
}

/**
 * Preferencias locales del dispositivo. Solo se guardan `escalaFuente` y
 * `bannerInstalarDescartado` (ADR-0018 permite localStorage para preferencias triviales).
 */
export const usePreferenciasStore = create<EstadoPreferencias>()(
  persist(
    (set) => ({
      escalaFuente: 1,
      bannerInstalarDescartado: false,
      setEscalaFuente: (escala) => {
        aplicarEscalaFuente(escala);
        set({ escalaFuente: escala });
      },
      descartarBannerInstalar: () => set({ bannerInstalarDescartado: true }),
    }),
    {
      name: 'stbc-preferencias',
      storage: createJSONStorage(() => ({
        getItem: (clave: string) => {
          try {
            return window.localStorage.getItem(clave);
          } catch {
            return null;
          }
        },
        setItem: (clave: string, valor: string) => {
          try {
            window.localStorage.setItem(clave, valor);
          } catch {
            // Preferencias no criticas: si localStorage falla, la app sigue funcionando.
          }
        },
        removeItem: (clave: string) => {
          try {
            window.localStorage.removeItem(clave);
          } catch {
            // sin accion
          }
        },
      })),
    }
  )
);

/** Aplica la escala guardada antes del primer render (evita saltos de maquetacion). */
export function aplicarEscalaGuardada(): void {
  const { escalaFuente } = usePreferenciasStore.getState();
  aplicarEscalaFuente(escalaFuente);
}
