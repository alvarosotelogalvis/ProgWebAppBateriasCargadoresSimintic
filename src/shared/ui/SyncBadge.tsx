import { Icon, type IconName } from '@/shared/ui/Icon';

import styles from './SyncBadge.module.css';

export type EstadoSync = 'pendiente' | 'sincronizado' | 'error';

const ICONOS: Record<EstadoSync, IconName> = {
  pendiente: 'pendiente',
  sincronizado: 'exito',
  error: 'error',
};

interface Props {
  readonly estado: EstadoSync;
  readonly etiqueta: string;
}

export function SyncBadge({ estado, etiqueta }: Props): React.JSX.Element {
  return (
    <span className={`${styles.badge!} ${styles[estado]}`}>
      <span className={styles.punto!} aria-hidden="true" />
      <Icon nombre={ICONOS[estado]} tamano={20} />
      <span className={styles.texto!}>{etiqueta}</span>
    </span>
  );
}
