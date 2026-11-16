import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { ColaSync } from '@/infrastructure/db/hooks';
import type { Servicio } from '@/domain/servicio';
import { Card } from '@/shared/ui/Card';
import { DonutProgress } from '@/shared/ui/DonutProgress';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';

import { ListaErrores } from './ListaErrores';
import { ListaConflictos } from './ListaConflictos';

import styles from './ResumenCola.module.css';

type Segmento = 'enCola' | 'conError' | 'conflictos';

interface Props {
  readonly cola: ColaSync;
  /** % de la ejecución en curso; `null` cuando no hay sincronización activa. */
  readonly porcentajeEnCurso: number | null;
  readonly onReintentar: (servicioId: string) => void;
  readonly servicios: readonly Servicio[];
}

/**
 * Resumen y cola según la referencia 07: donut con el % sincronizado (o el avance de
 * la ejecución en curso) y segmentos En cola · Con error · Conflictos.
 */
export function ResumenCola({
  cola,
  porcentajeEnCurso,
  onReintentar,
  servicios,
}: Props): React.JSX.Element {
  const { t } = useTranslation('sync');
  const navigate = useNavigate();
  const [segmento, setSegmento] = useState<Segmento>('enCola');

  const enCurso = porcentajeEnCurso !== null;
  const porcentaje = enCurso
    ? porcentajeEnCurso
    : cola.total > 0
      ? (cola.sincronizados / cola.total) * 100
      : 100;

  const segmentos = [
    { id: 'enCola', etiqueta: `${t('cola.segmentos.enCola')} (${cola.enCola.length})` },
    { id: 'conError', etiqueta: `${t('cola.segmentos.conError')} (${cola.conError.length})` },
    {
      id: 'conflictos',
      etiqueta: `${t('cola.segmentos.conflictos')} (${cola.conflictos.length})`,
    },
  ];

  return (
    <Card fill className={styles.tarjeta!}>
      <h2 className={styles.titulo!}>{t('cola.titulo')}</h2>

      <div className={styles.donut!}>
        <DonutProgress
          valor={porcentaje}
          etiqueta={enCurso ? t('cola.donutEnCurso') : t('cola.donut')}
        />
        <p className={styles.leyenda!}>
          {t('cola.sincronizados', { sincronizados: cola.sincronizados, total: cola.total })}
        </p>
      </div>

      <SegmentedControl
        aria-label={t('cola.segmentos.etiqueta')}
        items={segmentos}
        selectedKey={segmento}
        onChange={(clave) => setSegmento(clave as Segmento)}
      />

      {segmento === 'enCola' ? (
        <ListaErrores items={cola.enCola} vacio={t('cola.vacio.enCola')} />
      ) : null}
      {segmento === 'conError' ? (
        <ListaErrores
          items={cola.conError}
          vacio={t('cola.vacio.conError')}
          onReintentar={onReintentar}
        />
      ) : null}
      {segmento === 'conflictos' ? (
        <ListaConflictos
          servicios={servicios}
          onAbrir={(servicioId) => navigate(`/sincronizacion/conflicto/${servicioId}`)}
        />
      ) : null}
    </Card>
  );
}
