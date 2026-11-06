import styles from './DonutProgress.module.css';

interface Props {
  /** Porcentaje de 0 a 100. */
  readonly valor: number;
  readonly etiqueta?: string;
}

const RADIO = 52;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

const acotar = (valor: number): number => Math.min(100, Math.max(0, Math.round(valor)));

/** Anillo de progreso SVG propio, sin librerías de gráficas. */
export function DonutProgress({ valor, etiqueta = 'Sincronizado' }: Props): React.JSX.Element {
  const porcentaje = acotar(valor);
  const desplazamiento = CIRCUNFERENCIA * (1 - porcentaje / 100);

  return (
    <div
      role="img"
      aria-label={`${etiqueta}: ${porcentaje}%`}
      className={styles.contenedor!}
      data-valor={porcentaje}
    >
      <svg viewBox="0 0 120 120" className={styles.svg!} aria-hidden="true" focusable="false">
        <circle cx="60" cy="60" r={RADIO} className={styles.pista!} />
        <circle
          cx="60"
          cy="60"
          r={RADIO}
          className={styles.valor!}
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={desplazamiento}
        />
      </svg>
      <span className={styles.porcentaje!} aria-hidden="true">
        {porcentaje}%
      </span>
    </div>
  );
}
