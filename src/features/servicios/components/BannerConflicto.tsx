import { useTranslation } from 'react-i18next';
import type { Servicio } from '@/domain/servicio';

/**
 * Banner que muestra un conflicto en el detalle del servicio
 * UX §3.5: Banner de error + botón "RESOLVER"
 * T-021
 */

interface BannerConflictoProps {
  readonly servicio: Servicio;
  readonly onResolver: () => void;
}

export function BannerConflicto({ servicio, onResolver }: BannerConflictoProps) {
  const { t } = useTranslation('sync');

  if (servicio.syncState !== 'conflict') {
    return null;
  }

  const campos = servicio.conflictos.map((c) => c.campo).join(', ');

  return (
    <div role="alert">
      <p>{t('conflictos.banner.mensaje', { count: servicio.conflictos.length, campos })}</p>
      <button onClick={onResolver} type="button">
        {t('conflictos.banner.resolver')}
      </button>
    </div>
  );
}
