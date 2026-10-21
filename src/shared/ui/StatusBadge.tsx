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
  | 'ANULADO';

const CLASES: Record<EstadoServicio, string> = {
  BORRADOR: styles.borrador!,
  RECIBIDO: styles.recibido!,
  DIAGNOSTICADO: styles.diagnosticado!,
  COTIZADO: styles.cotizado!,
  EN_REPARACION: styles['en-reparacion']!,
  ENTREGADO: styles.entregado!,
  FACTURADO: styles.facturado!,
  DISPOSICION_FINAL: styles['disposicion-final']!,
  ANULADO: styles.anulado!,
};

interface Props {
  readonly estado: EstadoServicio;
  readonly etiqueta: string;
}

export function StatusBadge({ estado, etiqueta }: Props): React.JSX.Element {
  return <span className={`${styles.badge!} ${CLASES[estado]}`}>{etiqueta}</span>;
}
