import { Button, type ButtonProps } from 'react-aria-components';

import styles from './PrimaryButton.module.css';

export interface PrimaryButtonProps extends ButtonProps {
  readonly size?: 'normal' | 'small';
  readonly onGradient?: boolean;
}

export function PrimaryButton({
  size = 'normal',
  onGradient = false,
  className,
  ...props
}: PrimaryButtonProps): React.JSX.Element {
  const clases = [styles.boton!, styles[size], onGradient ? styles.onGradient! : '', className]
    .filter(Boolean)
    .join(' ');

  return <Button {...props} className={clases} />;
}
