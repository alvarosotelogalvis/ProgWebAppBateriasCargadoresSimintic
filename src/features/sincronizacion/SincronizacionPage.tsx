import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export function SincronizacionPage(): React.JSX.Element {
  const { t } = useTranslation('sync');

  return (
    <div>
      <Card fill>
        <EmptyState
          titulo={t('proximamente')}
          descripcion={t('proximamenteDescripcion')}
          icono="sincronizar"
        />
      </Card>
    </div>
  );
}
