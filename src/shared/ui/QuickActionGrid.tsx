import styles from './QuickActionGrid.module.css';

export interface AccionRapida {
  readonly id: string;
  readonly etiqueta: string;
  readonly icono: React.ReactNode;
  readonly badge?: number;
  readonly onClick?: () => void;
}

interface Props {
  readonly acciones: readonly AccionRapida[];
}

export function QuickActionGrid({ acciones }: Props): React.JSX.Element {
  return (
    <ul className={styles.grid!}>
      {acciones.map((accion) => (
        <li key={accion.id}>
          <button type="button" className={styles.boton!} onClick={accion.onClick}>
            <span className={styles.circulo!}>
              {accion.icono}
              {typeof accion.badge === 'number' && accion.badge > 0 ? (
                <span className={styles.badge!} aria-hidden="true">
                  {accion.badge}
                </span>
              ) : null}
            </span>
            <span className={styles.etiqueta!}>{accion.etiqueta}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
