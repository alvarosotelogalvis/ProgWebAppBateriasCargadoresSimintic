import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export function ConfiguracionInicialPage(): React.JSX.Element {
  const { t } = useTranslation('config');

  return (
    <div>
      <Card fill>
        <EmptyState
          titulo={t('proximamente')}
          descripcion={t('proximamenteDescripcion')}
          icono="configuracion"
        />
      </Card>
    </div>
  );
}
