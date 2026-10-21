import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { ListRow } from '@/shared/ui/ListRow';

const TEMAS = ['instalar', 'sin-conexion', 'preguntas-frecuentes'] as const;

export function AyudaPage(): React.JSX.Element {
  const { t } = useTranslation('ayuda');

  return (
    <div>
      <Card fill>
        <h2 className="titulo-seccion">{t('titulo')}</h2>
        {TEMAS.map((tema) => (
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
