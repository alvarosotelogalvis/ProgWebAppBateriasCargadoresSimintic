import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/shared/ui/Icon';

import styles from './EmptyState.module.css';

interface Props {
  readonly titulo: string;
  readonly descripcion?: string;
  readonly icono?: IconName;
  readonly accion?: ReactNode;
}

export function EmptyState({
  titulo,
  descripcion,
  icono = 'servicios',
  accion,
}: Props): React.JSX.Element {
  return (
    <div className={styles.estado!}>
      <span className={styles.circulo!}>
        <Icon nombre={icono} tamano={28} />
      </span>
      <h2 className={styles.titulo!}>{titulo}</h2>
      {descripcion ? <p className={styles.descripcion!}>{descripcion}</p> : null}
      {accion ? <div className={styles.accion!}>{accion}</div> : null}
    </div>
  );
}
