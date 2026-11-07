import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { registrarServiceWorker } from '@/infrastructure/pwa/registerSW';
import { useUiStore } from '@/shared/stores/uiStore';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { Banner } from '@/shared/ui/Banner';

export function AvisoActualizacion(): React.JSX.Element | null {
  const { t } = useTranslation('actualizacion');
  const hayNuevaVersion = useUiStore((estado) => estado.hayNuevaVersion);
  const bloqueos = useUiStore((estado) => estado.bloqueosActualizacion);
  const agregarToast = useUiStore((estado) => estado.agregarToast);

  useEffect(() => {
    registrarServiceWorker({
      onNuevaVersion: () => useUiStore.getState().setHayNuevaVersion(true),
    });
  }, []);

  if (!hayNuevaVersion) {
    return null;
  }

  const hayTrabajoEnCurso = bloqueos.size > 0;

  const aplicar = (): void => {
    if (hayTrabajoEnCurso) {
      agregarToast({ mensaje: t('esperara'), tipo: 'info' });
      return;
    }
    void aplicarActualizacion();
  };

  return (
    <Banner
      tipo="info"
      accion={
        <PrimaryButton size="small" onPress={aplicar}>
          {t('boton')}
        </PrimaryButton>
      }
    >
      {t('mensaje')}
    </Banner>
  );
}

async function aplicarActualizacion(): Promise<void> {
  const registration = await navigator.serviceWorker?.getRegistration();
  await registration?.update();
  window.location.reload();
}
