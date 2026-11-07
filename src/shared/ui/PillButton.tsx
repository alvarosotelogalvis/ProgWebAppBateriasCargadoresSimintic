import { Button, type ButtonProps } from 'react-aria-components';

import styles from './PillButton.module.css';

export interface PillButtonProps extends ButtonProps {
  readonly seleccionado?: boolean;
  readonly outlined?: boolean;
}

export function PillButton({
  seleccionado = false,
  outlined = false,
  className,
  ...props
}: PillButtonProps): React.JSX.Element {
  const clases = [
    styles.pastilla!,
    seleccionado ? styles.seleccionado! : '',
    outlined ? styles.outlined! : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Button {...props} className={clases} />;
}
