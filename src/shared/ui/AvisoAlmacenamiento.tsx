import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useContainer } from '@/app/containerContext';
import { Banner } from '@/shared/ui/Banner';

interface Props {
  readonly umbral?: number;
}

export function AvisoAlmacenamiento({ umbral = 80 }: Props): React.JSX.Element | null {
  const { t } = useTranslation('adjuntos');
  const container = useContainer();
  const [porcentaje, setPorcentaje] = useState<number>();

  useEffect(() => {
    let vigente = true;
    void container.storage
      .estimar()
      .then((estimacion) => {
        if (vigente) setPorcentaje(estimacion.porcentajeUsado);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [container.storage]);

  if (porcentaje === undefined || porcentaje < umbral) return null;

  return (
    <Banner tipo="advertencia">
      {t('almacenamiento.aviso', { porcentaje: Math.round(porcentaje) })}
    </Banner>
  );
}
