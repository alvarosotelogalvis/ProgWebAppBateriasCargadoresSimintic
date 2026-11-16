import { Navigate, Outlet } from 'react-router-dom';

import { evaluarInstalacion } from '@/infrastructure/pwa/estadoInstalacion';

/**
 * En iOS/iPadOS la app no se puede usar sin instalar (FR-001-04, R-01).
 * En otras plataformas solo se advierte y se puede continuar.
 */
export function InstallGate(): React.JSX.Element {
  if (evaluarInstalacion(window).requisito === 'bloquear') {
    return <Navigate to="/instalar" replace />;
  }

  return <Outlet />;
}
