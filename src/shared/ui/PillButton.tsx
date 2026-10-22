import { Button, type ButtonProps } from 'react-aria-components';

import styles from './PillButton.module.css';

export interface PillButtonProps extends ButtonProps {
  readonly seleccionado?: boolean;
}

export function PillButton({
  seleccionado = false,
  className,
  ...props
}: PillButtonProps): React.JSX.Element {
  const clases = [styles.pastilla!, seleccionado ? styles.seleccionado! : '', className]
    .filter(Boolean)
    .join(' ');

  return <Button {...props} className={clases} />;
}
