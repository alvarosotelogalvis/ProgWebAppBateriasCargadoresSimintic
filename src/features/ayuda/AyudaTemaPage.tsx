import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

import { esTemaAyuda } from './temas';

export function AyudaTemaPage(): React.JSX.Element {
  const { tema } = useParams<{ tema: string }>();
  const { t } = useTranslation('ayuda');

  if (!esTemaAyuda(tema)) {
    return (
      <Card fill>
        <EmptyState titulo={t('temaNoEncontrado')} icono="ayuda" />
      </Card>
    );
  }

  const pasos = t(`temas.${tema}.pasos`, { returnObjects: true }) as string[] | undefined;

  return (
    <div>
      <Card fill>
        <h2 className="titulo-seccion">{t(`temas.${tema}.titulo`)}</h2>
        <p className="descripcion">{t(`temas.${tema}.cuerpo`)}</p>
        {pasos && pasos.length > 0 ? (
          <ol className="pasos">
            {pasos.map((paso, indice) => (
              <li key={indice}>{paso}</li>
            ))}
          </ol>
        ) : null}
      </Card>
    </div>
  );
}
