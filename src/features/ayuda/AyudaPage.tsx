import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { ListRow } from '@/shared/ui/ListRow';

import { TEMAS_AYUDA } from './temas';

export function AyudaPage(): React.JSX.Element {
  const { t } = useTranslation('ayuda');

  return (
    <div>
      <Card fill>
        <h2 className="titulo-seccion">{t('titulo')}</h2>
        {TEMAS_AYUDA.map((tema) => (
          <ListRow
            key={tema}
            icono="ayuda"
            etiqueta={t(`temas.${tema}.titulo`)}
            href={`/ayuda/${tema}`}
          />
        ))}
      </Card>
    </div>
  );
}
