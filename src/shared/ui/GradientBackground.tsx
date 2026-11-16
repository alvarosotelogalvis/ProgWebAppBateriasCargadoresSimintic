import type { ReactNode } from 'react';

import { DecoCircle } from './DecoCircle';
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
      <DecoCircle posicion="arribaDerecha" />
      <DecoCircle posicion="abajoIzquierda" />
      <DecoCircle posicion="centroDerecha" />
      <div className={styles.contenido!}>{children}</div>
    </div>
  );
}
