import { Link, type LinkProps } from 'react-aria-components';

import styles from './TextLink.module.css';

export interface TextLinkProps extends LinkProps {
  readonly onGradient?: boolean;
}

export function TextLink({
  onGradient = false,
  className,
  ...props
}: TextLinkProps): React.JSX.Element {
  const clases = [styles.enlace!, onGradient ? styles.onGradient! : '', className]
    .filter(Boolean)
    .join(' ');

  return <Link {...props} className={clases} />;
}
