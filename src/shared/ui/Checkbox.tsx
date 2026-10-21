import {
  Checkbox as RACCheckbox,
  type CheckboxProps as RACCheckboxProps,
} from 'react-aria-components';

import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<RACCheckboxProps, 'className' | 'children'> {
  readonly etiqueta: string;
}

export function Checkbox({ etiqueta, ...props }: CheckboxProps): React.JSX.Element {
  return (
    <RACCheckbox {...props} className={styles.envoltorio!}>
      <span className={styles.casilla!} aria-hidden="true" />
      <span className={styles.etiqueta!}>{etiqueta}</span>
    </RACCheckbox>
  );
}
