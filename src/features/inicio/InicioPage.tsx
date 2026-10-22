import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export function InicioPage(): React.JSX.Element {
  const { t } = useTranslation('common');

  return (
    <div>
      <Card fill>
        <EmptyState
          titulo={t('inicio:vacio.titulo', 'Aun no hay servicios')}
          descripcion={t(
            'inicio:vacio.descripcion',
            'Registra la recepcion de una bateria o cargador para empezar.'
          )}
        />
      </Card>
    </div>
  );
}
