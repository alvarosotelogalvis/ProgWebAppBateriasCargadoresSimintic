import styles from './Skeleton.module.css';

interface Props {
  readonly lineas?: number;
  readonly alto?: string;
}

export function Skeleton({ lineas = 3, alto = '1rem' }: Props): React.JSX.Element {
  return (
    <div className={styles.contenedor!} aria-hidden="true">
      {Array.from({ length: lineas }, (_, indice) => (
        <span key={indice} className={styles.linea!} style={{ height: alto }} />
      ))}
    </div>
  );
}
