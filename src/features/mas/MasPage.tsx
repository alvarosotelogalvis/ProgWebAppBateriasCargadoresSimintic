import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useSesionStore } from '@/shared/stores/sesionStore';
import { Card } from '@/shared/ui/Card';
import { ListRow } from '@/shared/ui/ListRow';

export function MasPage(): React.JSX.Element {
  const { t } = useTranslation('navegacion');
  const navigate = useNavigate();
  const roles = useSesionStore((estado) => estado.roles);
  const esAdmin = roles.includes('Administrador');

  return (
    <div>
      <Card fill>
        <h2 className="titulo-seccion">{t('mas')}</h2>
        <ListRow icono="persona" etiqueta={t('miCuenta')} href="/cuenta" />
        <ListRow
          icono="configuracion"
          etiqueta={t('configuracionInicial')}
          onClick={() => navigate('/configuracion-inicial?modo=repetir')}
        />
        <ListRow icono="configuracion" etiqueta={t('ajustes')} href="/ajustes" />
        <ListRow icono="ayuda" etiqueta={t('ayuda')} href="/ayuda" />
        <ListRow icono="acerca" etiqueta={t('acerca')} href="/acerca" />
        <ListRow icono="notificaciones" etiqueta={t('alertas')} href="/alertas" />
        {esAdmin ? <ListRow icono="soporte" etiqueta={t('tecnico')} href="/tecnico" /> : null}
      </Card>
    </div>
  );
}
