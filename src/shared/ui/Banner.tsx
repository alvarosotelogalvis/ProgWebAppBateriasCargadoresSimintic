import type { ReactNode } from 'react';

import styles from './Banner.module.css';

interface Props {
  readonly children: ReactNode;
  readonly tipo?: 'info' | 'exito' | 'advertencia' | 'peligro';
  readonly accion?: ReactNode;
}

export function Banner({ children, tipo = 'info', accion }: Props): React.JSX.Element {
  const roles: Record<string, 'status' | 'alert'> = {
    info: 'status',
    exito: 'status',
    advertencia: 'status',
    peligro: 'alert',
  };

  return (
    <div role={roles[tipo]} className={`${styles.banner!} ${styles[tipo]}`}>
      <div className={styles.texto!}>{children}</div>
      {accion ? <div className={styles.accion!}>{accion}</div> : null}
    </div>
  );
}
