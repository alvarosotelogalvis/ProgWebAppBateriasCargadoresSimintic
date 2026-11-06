import { useCallback, useEffect, useRef, useState } from 'react';

import { debeMostrarAvisoConexion } from '@/application/sync/avisosSync';

export interface DepsAvisoConexion {
  readonly pendientes: () => number;
  readonly sesionVigente: () => Promise<boolean>;
  readonly ahoraMs?: () => number;
}

export interface AvisoConexion {
  /** Pendientes a mostrar en el aviso, o `null` si no hay aviso visible. */
  readonly pendientes: number | null;
  readonly descartar: () => void;
}

/**
 * ES-005-21: al volver la conexión ofrece "¿Sincronizar ahora?" si hay pendientes y
 * la sesión está dentro de la ventana; como máximo una vez cada 30 min. Nunca sincroniza.
 */
export function useAvisoConexion(deps: DepsAvisoConexion): AvisoConexion {
  const [pendientes, setPendientes] = useState<number | null>(null);
  const ultimoAviso = useRef<number | null>(null);
  const refDeps = useRef(deps);
  refDeps.current = deps;

  useEffect(() => {
    let vigente = true;

    const alVolverConexion = async (): Promise<void> => {
      const { pendientes: contar, sesionVigente, ahoraMs = Date.now } = refDeps.current;
      const cantidad = contar();
      if (cantidad <= 0) return;

      let sesion = false;
      try {
        sesion = await sesionVigente();
      } catch {
        sesion = false;
      }

      const ahora = ahoraMs();
      if (
        !vigente ||
        !debeMostrarAvisoConexion({
          pendientes: cantidad,
          sesionVigente: sesion,
          ultimoAvisoMs: ultimoAviso.current,
          ahoraMs: ahora,
        })
      ) {
        return;
      }

      ultimoAviso.current = ahora;
      setPendientes(cantidad);
    };

    const escucha = (): void => {
      void alVolverConexion();
    };
    window.addEventListener('online', escucha);
    return () => {
      vigente = false;
      window.removeEventListener('online', escucha);
    };
  }, []);

  const descartar = useCallback(() => setPendientes(null), []);

  return { pendientes, descartar };
}
