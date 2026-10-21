import { Navigate, Outlet } from 'react-router-dom';

import { detectarPlataforma, requiereInstalacion } from '@/infrastructure/pwa/plataforma';
import { esStandaloneEnVentana } from '@/infrastructure/pwa/standalone';

interface NavigatorConUAData extends Navigator {
  readonly userAgentData?: {
    readonly platform?: string;
    readonly brands?: ReadonlyArray<{ readonly brand: string }>;
  };
}

/**
 * En iOS/iPadOS la app no se puede usar sin instalar (FR-001-04, R-01).
 * En otras plataformas solo se advierte y se puede continuar.
 */
export function InstallGate(): React.JSX.Element {
  const standalone = esStandaloneEnVentana(window);
  const nav = navigator as NavigatorConUAData;
  const plataforma = detectarPlataforma(nav.userAgent, nav.userAgentData);
  const requisito = requiereInstalacion(plataforma, standalone);

  if (requisito === 'bloquear') {
    return <Navigate to="/instalar" replace />;
  }

  return <Outlet />;
}
