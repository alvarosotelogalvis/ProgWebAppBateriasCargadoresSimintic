import styles from './SummaryCard.module.css';

interface Props {
  readonly nombre: string;
  readonly saludo: string;
  readonly pendientes: number;
  readonly etiquetaPendientes: string;
}

export function SummaryCard({
  nombre,
  saludo,
  pendientes,
  etiquetaPendientes,
}: Props): React.JSX.Element {
  return (
    <div className={styles.tarjeta!}>
      <span className={styles.avatar!} aria-hidden="true">
        {nombre.slice(0, 1).toUpperCase()}
      </span>
      <div className={styles.textos!}>
        <p className={styles.saludo!}>{saludo}</p>
        <p className={styles.nombre!}>{nombre}</p>
        <p className={styles.pendientes!} data-pendientes={pendientes}>
          <span className={styles.cifra!}>{pendientes}</span> {etiquetaPendientes}
        </p>
      </div>
    </div>
  );
}
