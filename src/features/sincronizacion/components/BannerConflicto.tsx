import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useServicio } from '@/infrastructure/db/hooks';
import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';

import { etiquetaCampo } from '../etiquetasCampos';

interface BannerConflictoProps {
  readonly servicioId: string;
}

/** Aviso en el detalle del servicio cuando hay conflictos; lleva a la pantalla de resolución. */
export function BannerConflicto({ servicioId }: BannerConflictoProps): React.JSX.Element | null {
  const { t } = useTranslation('sync');
  const navigate = useNavigate();
  const servicio = useServicio(servicioId);

  if (!servicio || servicio.syncState !== 'conflict') return null;

  const campos = servicio.conflictos
    .map((conflicto) => etiquetaCampo(t, conflicto.campo))
    .join(', ');

  return (
    <Banner
      tipo="peligro"
      accion={
        <PrimaryButton
          size="small"
          onPress={() => navigate(`/sincronizacion/conflicto/${servicioId}`)}
        >
          {t('conflictos.banner.resolver')}
        </PrimaryButton>
      }
    >
      {t('conflictos.banner.mensaje', { count: servicio.conflictos.length, campos })}
    </Banner>
  );
}
