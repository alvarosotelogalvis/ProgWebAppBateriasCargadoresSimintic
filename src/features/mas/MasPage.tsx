import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { ListRow } from '@/shared/ui/ListRow';

export function MasPage(): React.JSX.Element {
  const { t } = useTranslation('navegacion');

  return (
    <div>
      <Card fill>
        <h2 className="titulo-seccion">{t('mas')}</h2>
        <ListRow icono="configuracion" etiqueta={t('ajustes')} href="/ajustes" />
        <ListRow icono="ayuda" etiqueta={t('ayuda')} href="/ayuda" />
        <ListRow icono="acerca" etiqueta={t('acerca')} href="/acerca" />
        <ListRow icono="notificaciones" etiqueta={t('alertas')} href="/alertas" />
        <ListRow icono="soporte" etiqueta={t('tecnico')} href="/tecnico" />
      </Card>
    </div>
  );
}
