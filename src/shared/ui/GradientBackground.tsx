import type { ReactNode } from 'react';

import styles from './GradientBackground.module.css';

export type VarianteFondo = 'principal' | 'suave';

interface Props {
  readonly children: ReactNode;
  readonly variante?: VarianteFondo;
}

export function GradientBackground({ children, variante = 'principal' }: Props): React.JSX.Element {
  const clases = [styles.fondo!, styles[variante]].join(' ');

  return (
    <div className={clases}>
      <span className={styles.decoUno!} aria-hidden="true" />
      <span className={styles.decoDos!} aria-hidden="true" />
      <span className={styles.decoTres!} aria-hidden="true" />
      <div className={styles.contenido!}>{children}</div>
    </div>
  );
}
