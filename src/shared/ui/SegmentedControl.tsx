import {
  ToggleButton,
  ToggleButtonGroup,
  type ToggleButtonGroupProps as RACToggleButtonGroupProps,
} from 'react-aria-components';

import styles from './SegmentedControl.module.css';

export interface SegmentadoItem {
  readonly id: string;
  readonly etiqueta: string;
}

export interface SegmentedControlProps
  extends Omit<
    RACToggleButtonGroupProps,
    'className' | 'children' | 'selectedKeys' | 'defaultSelectedKeys' | 'onSelectionChange' | 'selectionMode'
  > {
  readonly items: ReadonlyArray<SegmentadoItem>;
  readonly selectedKey: string;
  readonly onChange: (clave: string) => void;
  readonly className?: string;
}

export function SegmentedControl({
  items,
  selectedKey,
  onChange,
  className,
  ...props
}: SegmentedControlProps): React.JSX.Element {
  const clases = [styles.grupo!, className].filter(Boolean).join(' ');

  return (
    <ToggleButtonGroup
      {...props}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={new Set([selectedKey])}
      onSelectionChange={(keys) => {
        const [primero] = [...keys];
        if (primero !== undefined) onChange(String(primero));
      }}
      className={clases}
    >
      {items.map((item) => (
        <ToggleButton key={item.id} id={item.id} className={styles.opcion!}>
          {item.etiqueta}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
