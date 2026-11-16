import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';

export function NuevoServicioPage(): React.JSX.Element {
  const { t } = useTranslation('common');
  const { casosDeUso } = useContainer();
  const navigate = useNavigate();
  const creando = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (creando.current) return;
    creando.current = true;
    casosDeUso
      .crearBorrador()
      .then((servicio) => {
        navigate(`/servicios/${servicio.id}/etapa/recepcion`, { replace: true });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [casosDeUso, navigate]);

  if (error !== null) {
    return (
      <div role="alert">
        <p>{t('app.crearServicioError')}</p>
        <p>{error}</p>
      </div>
    );
  }

  return <p role="status">{t('app.creandoServicio')}</p>;
}
