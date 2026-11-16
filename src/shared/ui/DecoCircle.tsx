import styles from './DecoCircle.module.css';

/** Posición fija en la pantalla; cada una ajusta su tamaño y lugar por breakpoint. */
export type PosicionDeco = 'arribaDerecha' | 'abajoIzquierda' | 'centroDerecha';

interface Props {
  readonly posicion: PosicionDeco;
}

/**
 * Círculo decorativo del fondo en degradado (`docs/10` §2.5). Solo adorna: va oculto a
 * lectores de pantalla y no captura toques.
 */
export function DecoCircle({ posicion }: Props): React.JSX.Element {
  return <span className={`${styles.circulo!} ${styles[posicion]}`} aria-hidden="true" />;
}
