import styles from './BarList.module.css';

export interface ItemBarList {
  readonly id: string;
  readonly etiqueta: string;
  /** Porcentaje de 0 a 100. */
  readonly valor: number;
  readonly detalle?: string;
  readonly tono?: 'primary' | 'accent' | 'peligro';
}

interface Props {
  readonly items: readonly ItemBarList[];
  readonly etiqueta?: string;
}

const acotar = (valor: number): number => Math.min(100, Math.max(0, Math.round(valor)));

/** Barras de progreso accesibles para el avance de servicios y archivos. */
export function BarList({ items, etiqueta }: Props): React.JSX.Element {
  return (
    <ul className={styles.lista!} aria-label={etiqueta}>
      {items.map((item) => {
        const valor = acotar(item.valor);
        const tono = item.tono ?? 'primary';

        return (
          <li key={item.id} className={styles.fila!}>
            <div className={styles.cabecera!}>
              <span className={styles.etiqueta!}>{item.etiqueta}</span>
              <span className={styles.detalle!}>{item.detalle ?? `${valor}%`}</span>
            </div>
            <div
              role="progressbar"
              aria-label={item.etiqueta}
              aria-valuenow={valor}
              aria-valuemin={0}
              aria-valuemax={100}
              className={styles.pista!}
            >
              <span
                className={`${styles.barra!} ${styles[tono]!}`}
                style={{ width: `${valor}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
