import type { ReactNode } from 'react';

import styles from './Card.module.css';

export interface CardProps {
  readonly children: ReactNode;
  readonly fill?: boolean;
  readonly pegadaAbajo?: boolean;
  readonly className?: string;
}

export function Card({
  children,
  fill = false,
  pegadaAbajo = false,
  className,
}: CardProps): React.JSX.Element {
  const clases = [
    styles.tarjeta!,
    fill ? styles.fill! : '',
    pegadaAbajo ? styles['pegada-abajo']! : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return <section className={clases}>{children}</section>;
}
