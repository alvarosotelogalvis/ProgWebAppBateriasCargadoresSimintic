import { useTranslation } from 'react-i18next';

import type { EstadoServicio } from '@/domain/servicio';

import { Icon } from '@/shared/ui/Icon';

import styles from './LineaTiempoEtapas.module.css';

export type PasoClave = 'recepcion' | 'diagnostico' | 'orden' | 'entrega' | 'facturacion';

interface Paso {
  readonly clave: PasoClave;
}

const PASOS: readonly Paso[] = [
  { clave: 'recepcion' },
  { clave: 'diagnostico' },
  { clave: 'orden' },
  { clave: 'entrega' },
  { clave: 'facturacion' },
];

interface Progreso {
  readonly completadas: number;
  readonly actual: number;
}

const PROGRESO: Readonly<Record<EstadoServicio, Progreso>> = {
  BORRADOR: { completadas: 0, actual: 0 },
  RECIBIDO: { completadas: 1, actual: 1 },
  DIAGNOSTICADO: { completadas: 2, actual: 2 },
  COTIZADO: { completadas: 2, actual: 2 },
  EN_REPARACION: { completadas: 3, actual: 2 },
  ENTREGADO: { completadas: 4, actual: 4 },
  FACTURADO: { completadas: 5, actual: -1 },
  DISPOSICION_FINAL: { completadas: 5, actual: -1 },
  ANULADO: { completadas: 0, actual: -1 },
  DESCONOCIDO: { completadas: 0, actual: -1 },
};

interface Props {
  readonly estado: EstadoServicio;
  /** Una línea de resumen bajo cada paso que ya tiene datos (p. ej. el diagnóstico). */
  readonly resumenes?: Partial<Record<PasoClave, string>>;
  /** Quién debe avanzar la etapa actual cuando el usuario no puede (p. ej. "Pendiente de Comercial"). */
  readonly pendienteDe?: string | undefined;
}

export function LineaTiempoEtapas({ estado, resumenes, pendienteDe }: Props): React.JSX.Element {
  const { t } = useTranslation('servicios');
  const progreso = PROGRESO[estado];

  return (
    <ol className={styles.linea!} aria-label={t('detalle.timeline.titulo')}>
      {PASOS.map((paso, indice) => {
        const completada = indice < progreso.completadas;
        const actual = indice === progreso.actual;
        const estadoPaso = completada
          ? t('detalle.timeline.completada')
          : actual
            ? t('detalle.timeline.actual')
            : t('detalle.timeline.pendiente');
        const clase = completada ? styles.completada : actual ? styles.actual : styles.pendiente;
        return (
          <li
            key={paso.clave}
            className={`${styles.paso!} ${clase!}`}
            aria-current={actual ? 'step' : undefined}
          >
            <span className={styles.marcador!} aria-hidden="true">
              {completada ? (
                <Icon nombre="verificado" tamano={20} />
              ) : (
                <span className={styles.numero!}>{indice + 1}</span>
              )}
            </span>
            <span className={styles.texto!}>
              <span className={styles.etiqueta!}>{t(`detalle.timeline.${paso.clave}`)}</span>
              {resumenes?.[paso.clave] ? (
                <span className={styles.resumen!}>{resumenes[paso.clave]}</span>
              ) : null}
              {actual && pendienteDe ? (
                <span className={styles['pendiente-de']!}>{pendienteDe}</span>
              ) : null}
            </span>
            <span className={styles.oculto!}>{estadoPaso}</span>
          </li>
        );
      })}
    </ol>
  );
}
