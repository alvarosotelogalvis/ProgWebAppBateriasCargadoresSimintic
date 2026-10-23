import styles from './StatusBadge.module.css';

export type EstadoServicio =
  | 'BORRADOR'
  | 'RECIBIDO'
  | 'DIAGNOSTICADO'
  | 'COTIZADO'
  | 'EN_REPARACION'
  | 'ENTREGADO'
  | 'FACTURADO'
  | 'DISPOSICION_FINAL'
  | 'ANULADO'
  | 'DESCONOCIDO';

const CLASES: Record<EstadoServicio, string> = {
  BORRADOR: styles.borrador!,
  RECIBIDO: styles.recibido!,
  DIAGNOSTICADO: styles.diagnosticado!,
  COTIZADO: styles.cotizado!,
  EN_REPARACION: styles.enReparacion!,
  ENTREGADO: styles.entregado!,
  FACTURADO: styles.facturado!,
  DISPOSICION_FINAL: styles.disposicionFinal!,
  ANULADO: styles.anulado!,
  DESCONOCIDO: styles.borrador!,
};

interface Props {
  readonly estado: EstadoServicio;
  readonly etiqueta: string;
}

export function StatusBadge({ estado, etiqueta }: Props): React.JSX.Element {
  return <span className={`${styles.badge!} ${CLASES[estado]}`}>{etiqueta}</span>;
}
