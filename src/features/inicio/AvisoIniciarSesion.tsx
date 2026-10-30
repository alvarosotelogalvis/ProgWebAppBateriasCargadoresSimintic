import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { TextLink } from '@/shared/ui/TextLink';

export function AvisoIniciarSesion(): React.JSX.Element | null {
  const { t } = useTranslation('auth');
  const cuenta = useSesionStore((estado) => estado.cuenta);
  const navigate = useNavigate();

  if (cuenta) return null;

  return (
    <Banner
      tipo="info"
      accion={
        <TextLink onPress={() => navigate('/configuracion-inicial')}>
          {t('avisoSesionAccion', 'Iniciar sesion')}
        </TextLink>
      }
    >
      {t('avisoSesion')}
    </Banner>
  );
}
