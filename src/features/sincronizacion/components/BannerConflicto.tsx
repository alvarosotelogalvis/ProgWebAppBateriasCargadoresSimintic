import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useServicio } from '@/infrastructure/db/hooks';
import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';

interface BannerConflictoProps {
  readonly servicioId: string;
}

/**
 * Banner mostrado en la página de detalle del servicio cuando hay conflictos
 * Ofrece navegación a la página de resolución
 * T-021
 */
export function BannerConflicto({ servicioId }: BannerConflictoProps): React.JSX.Element {
  const { t } = useTranslation('sync');
  const navigate = useNavigate();
  const servicio = useServicio(servicioId);

  if (!servicio || servicio.syncState !== 'conflict') {
    return <></>;
  }

  const cantidadConflictos = servicio.conflictos.length;
  const campos = servicio.conflictos.map((c) => c.campo).join(', ');

  return (
    <Banner
      tipo="advertencia"
      accion={
        <PrimaryButton onPress={() => navigate(`/sincronizacion/conflicto/${servicioId}`)}>
          {t('conflictos.banner.resolver')}
        </PrimaryButton>
      }
    >
      {t('conflictos.banner.mensaje', {
        count: cantidadConflictos,
        campos,
        defaultValue: `${cantidadConflictos} conflictos: ${campos}`,
      })}
    </Banner>
  );
}
