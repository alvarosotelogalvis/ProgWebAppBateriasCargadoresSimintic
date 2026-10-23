import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';

export function NuevoServicioPage(): React.JSX.Element {
  const { t } = useTranslation('common');
  const { casosDeUso } = useContainer();
  const navigate = useNavigate();
  const creando = useRef(false);

  useEffect(() => {
    if (creando.current) return;
    creando.current = true;
    void casosDeUso.crearBorrador().then((servicio) => {
      navigate(`/servicios/${servicio.id}/etapa/recepcion`, { replace: true });
    });
  }, [casosDeUso, navigate]);

  return <p role="status">{t('app.creandoServicio')}</p>;
}
