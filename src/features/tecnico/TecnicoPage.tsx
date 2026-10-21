import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export function TecnicoPage(): React.JSX.Element {
  const { t } = useTranslation('tecnico');

  return (
    <div>
      <Card fill>
        <EmptyState
          titulo={t('proximamente')}
          descripcion={t('proximamenteDescripcion')}
          icono="soporte"
        />
      </Card>
    </div>
  );
}
