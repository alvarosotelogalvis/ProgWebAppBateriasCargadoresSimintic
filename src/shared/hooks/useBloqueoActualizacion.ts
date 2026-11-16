import { useEffect, useId } from 'react';

import { useUiStore } from '@/shared/stores/uiStore';

/**
 * Mientras `activo` sea true, impide que se aplique una actualización de la app: hay trabajo
 * sin guardar o una sincronización en curso (FR-001-11, ES-001-19). Se libera solo al dejar de
 * estar activo o al desmontarse el componente.
 */
export function useBloqueoActualizacion(activo: boolean): void {
  const id = useId();

  useEffect(() => {
    if (!activo) return undefined;
    useUiStore.getState().bloquearActualizacion(id);
    return () => useUiStore.getState().liberarActualizacion(id);
  }, [activo, id]);
}
