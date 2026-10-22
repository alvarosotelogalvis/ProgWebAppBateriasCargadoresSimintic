import { useUiStore } from '@/shared/stores/uiStore';

/** Publica el número de servicios pendientes en el store de UI de la spec 001. */
export const sincronizarContadorPendientes = (pendientes: number): void => {
  useUiStore.getState().setPendientes(pendientes);
};
