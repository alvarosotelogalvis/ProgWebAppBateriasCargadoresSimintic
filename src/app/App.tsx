import { RouterProvider } from 'react-router-dom';

import { ContainerProvider } from '@/app/containerContext';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { Proveedores } from '@/app/providers';
import { router } from '@/app/router';
import { obtenerEnv } from '@/shared/env';
import { PantallaErrorConfiguracion } from '@/app/PantallaErrorConfiguracion';

export function App(): React.JSX.Element {
  const env = obtenerEnv();

  if (!env.ok) {
    return <PantallaErrorConfiguracion mensaje={env.error} />;
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
