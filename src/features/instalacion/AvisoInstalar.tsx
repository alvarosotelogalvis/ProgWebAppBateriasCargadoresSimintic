import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { usePreferenciasStore } from '@/features/ajustes/preferenciasStore';
import { evaluarInstalacion } from '@/infrastructure/pwa/estadoInstalacion';
import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

/**
 * Banner descartable que recomienda instalar la app cuando se usa desde el navegador en una
 * plataforma que lo permite pero no lo exige (ES-001-04). Una vez descartado no vuelve.
 */
export function AvisoInstalar(): React.JSX.Element | null {
  const { t } = useTranslation('instalacion');
  const navegar = useNavigate();
  const descartado = usePreferenciasStore((estado) => estado.bannerInstalarDescartado);
  const descartar = usePreferenciasStore((estado) => estado.descartarBannerInstalar);

  if (descartado || evaluarInstalacion(window).requisito !== 'advertir') return null;

  return (
    <Banner
      tipo="info"
      accion={
        <>
          <PrimaryButton size="small" onPress={() => navegar('/instalar')}>
            {t('banner.instalar')}
          </PrimaryButton>
          <SecondaryButton onPress={descartar}>{t('banner.descartar')}</SecondaryButton>
        </>
      }
    >
      {t('banner.mensaje')}
    </Banner>
  );
}
