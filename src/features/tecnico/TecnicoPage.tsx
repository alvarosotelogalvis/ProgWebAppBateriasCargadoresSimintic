import { useCallback } from 'react';

import { useContainer } from '@/app/containerContext';
import { restablecerApp } from '@/application/mantenimiento/restablecerApp';

import { MenuTecnicoPage } from './MenuTecnicoPage';

/** Ruta `/tecnico` (solo Administrador). */
export function TecnicoPage(): React.JSX.Element {
  const container = useContainer();

  const restablecer = useCallback(async (): Promise<void> => {
    await restablecerApp(container.db);
    // Reinicio completo: vuelve a leer la base ya vacía y a pedir la configuración inicial.
    window.location.assign('/');
  }, [container.db]);

  return <MenuTecnicoPage onRestablecerApp={restablecer} />;
}
