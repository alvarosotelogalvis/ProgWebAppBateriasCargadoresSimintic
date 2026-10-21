import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export function AlertasPage(): React.JSX.Element {
  const { t } = useTranslation('alertas');

  return (
    <div>
      <Card fill>
        <EmptyState
          titulo={t('proximamente')}
          descripcion={t('proximamenteDescripcion')}
          icono="notificaciones"
        />
      </Card>
    </div>
  );
}
