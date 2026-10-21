import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export function ServiciosPage(): React.JSX.Element {
  const { t } = useTranslation('servicios');

  return (
    <div>
      <Card fill>
        <EmptyState
          titulo={t('vacio')}
          descripcion={t('vacioDescripcion')}
          icono="servicios"
        />
      </Card>
    </div>
  );
}
