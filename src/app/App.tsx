import { RouterProvider } from 'react-router-dom';

import { ContainerProvider } from '@/app/containerContext';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { Proveedores } from '@/app/providers';
import { router } from '@/app/router';
import { PantallaSinAcceso } from '@/features/auth/PantallaSinAcceso';
import { leerRechazoAuth, reintentarAcceso } from '@/infrastructure/auth/arranque';
import { obtenerEnv } from '@/shared/env';
import { PantallaErrorConfiguracion } from '@/app/PantallaErrorConfiguracion';

export function App(): React.JSX.Element {
  const env = obtenerEnv();
  const rechazo = leerRechazoAuth();

  if (!env.ok) {
    return <PantallaErrorConfiguracion mensaje={env.error} />;
  }

  if (rechazo) {
    return (
      <Proveedores>
        <PantallaSinAcceso codigo={rechazo} onOtraCuenta={() => void reintentarAcceso()} />
      </Proveedores>
    );
  }

  return (
    <ErrorBoundary>
      <Proveedores>
        <ContainerProvider>
          <RouterProvider router={router} />
        </ContainerProvider>
      </Proveedores>
    </ErrorBoundary>
  );
}
