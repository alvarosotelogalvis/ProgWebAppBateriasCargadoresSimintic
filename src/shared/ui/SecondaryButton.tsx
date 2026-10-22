import { Button, type ButtonProps } from 'react-aria-components';

import styles from './SecondaryButton.module.css';

export interface SecondaryButtonProps extends ButtonProps {
  readonly onGradient?: boolean;
}

export function SecondaryButton({
  onGradient = false,
  className,
  ...props
}: SecondaryButtonProps): React.JSX.Element {
  const clases = [styles.boton!, onGradient ? styles['on-gradient']! : '', className]
    .filter(Boolean)
    .join(' ');

  return <Button {...props} className={clases} />;
}
