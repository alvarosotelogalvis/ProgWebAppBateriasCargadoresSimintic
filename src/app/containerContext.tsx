/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { conectarSyncStore } from '@/features/sincronizacion/store/useSyncStore';

import { crearContainer, type Container } from './container';

const Contexto = createContext<Container | null>(null);

interface Props {
  readonly children: ReactNode;
}

export function ContainerProvider({ children }: Props): React.JSX.Element {
  const { t } = useTranslation('common');
  const [container, setContainer] = useState<Container | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    crearContainer()
      .then((creado) => {
        if (vigente) setContainer(creado);
      })
      .catch((causa: unknown) => {
        if (vigente) setError(causa instanceof Error ? causa.message : String(causa));
      });
    return () => {
      vigente = false;
    };
  }, []);

  // El progreso del sync se registra aunque el usuario salga de la pantalla (T027).
  useEffect(() => (container ? conectarSyncStore(container.eventosSync) : undefined), [container]);

  if (error) {
    return (
      <p role="alert">
        {t('app.baseDatosError')} {error}
      </p>
    );
  }

  if (!container) return <p>{t('app.cargando')}</p>;

  return <Contexto.Provider value={container}>{children}</Contexto.Provider>;
}

export function useContainer(): Container {
  const container = useContext(Contexto);
  if (!container) throw new Error('useContainer debe usarse dentro de ContainerProvider');
  return container;
}
