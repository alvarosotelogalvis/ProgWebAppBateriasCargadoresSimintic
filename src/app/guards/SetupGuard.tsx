import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSesionStore } from '@/shared/stores/sesionStore';

/**
 * Si la configuracion inicial no se ha completado, lleva al asistente.
 * ES-001-12.
 */
export function SetupGuard(): React.JSX.Element {
  const completada = useSesionStore((estado) => estado.configuracionInicialCompleta);
  const ubicacion = useLocation();

  if (!completada) {
    return <Navigate to="/configuracion-inicial" replace state={{ desde: ubicacion.pathname }} />;
  }

  return <Outlet />;
}
