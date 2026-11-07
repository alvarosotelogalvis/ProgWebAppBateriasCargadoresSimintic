import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoGuardado = 'inactivo' | 'guardando' | 'guardado' | 'error';

export const useAutoguardado = <T>(guardar: (cambios: T) => Promise<unknown>) => {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [estado, setEstado] = useState<EstadoGuardado>('inactivo');

  const cancelar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const programar = useCallback(
    (cambios: T) => {
      cancelar();
      setEstado('guardando');
      timer.current = setTimeout(() => {
        void guardar(cambios)
          .then(() => setEstado('guardado'))
          .catch(() => setEstado('error'));
      }, 800);
    },
    [cancelar, guardar]
  );

  useEffect(() => cancelar, [cancelar]);

  return { estado, programar, cancelar };
};
