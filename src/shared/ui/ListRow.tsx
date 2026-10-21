import { Icon, type IconName } from '@/shared/ui/Icon';

import styles from './ListRow.module.css';

interface Props {
  readonly icono: IconName;
  readonly etiqueta: string;
  readonly descripcion?: string;
  readonly onClick?: () => void;
  readonly href?: string;
}

export function ListRow({
  icono,
  etiqueta,
  descripcion,
  onClick,
  href,
}: Props): React.JSX.Element {
  const contenido = (
    <>
      <span className={styles.icono!}>
        <Icon nombre={icono} tamano={24} />
      </span>
      <span className={styles.textos!}>
        <span className={styles.etiqueta!}>{etiqueta}</span>
        {descripcion ? <span className={styles.descripcion!}>{descripcion}</span> : null}
      </span>
      <span className={styles.chevron!} aria-hidden="true">
        <Icon nombre="chevronDerecha" tamano={24} />
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={styles.fila!}>
        {contenido}
      </a>
    );
  }

  return (
    <button type="button" className={styles.fila!} onClick={onClick}>
      {contenido}
    </button>
  );
}
