import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { useUiStore } from '@/shared/stores/uiStore';
import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import { useAvisoConexion } from '../hooks/useAvisoConexion';

import styles from './AvisoConexion.module.css';

/** ES-005-21: aviso al volver la conexión. Solo lleva a Sincronización; nunca sincroniza. */
export function AvisoConexion(): React.JSX.Element | null {
  const { t } = useTranslation('sync');
  const container = useContainer();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { pendientes, descartar } = useAvisoConexion({
    pendientes: () => useUiStore.getState().pendientes,
    sesionVigente: () => container.sesionSyncVigente(),
  });

  if (pendientes === null || pathname.startsWith('/sincronizacion')) return null;

  return (
    <Banner
      tipo="info"
      accion={
        <div className={styles.acciones!}>
          <PrimaryButton
            onPress={() => {
              descartar();
              navigate('/sincronizacion');
            }}
          >
            {t('avisoConexion.sincronizar')}
          </PrimaryButton>
          <SecondaryButton onPress={descartar}>{t('avisoConexion.ahoraNo')}</SecondaryButton>
        </div>
      }
    >
      {t('avisoConexion.mensaje', { count: pendientes })}
    </Banner>
  );
}
