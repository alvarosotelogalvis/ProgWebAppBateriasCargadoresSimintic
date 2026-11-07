import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/shared/ui/Icon';

import styles from './Chip.module.css';

interface Props {
  readonly children: ReactNode;
  readonly tono?: 'account' | 'tag';
  readonly icono?: IconName;
  readonly className?: string;
}

/** Chip corto para destacar contexto (cuenta, destino o etiqueta). */
export function Chip({ children, tono = 'account', icono, className }: Props): React.JSX.Element {
  const clases = [styles.chip!, styles[tono]!, className].filter(Boolean).join(' ');

  return (
    <span className={clases} data-tono={tono}>
      {icono ? <Icon nombre={icono} tamano={20} /> : null}
      {children}
    </span>
  );
}
