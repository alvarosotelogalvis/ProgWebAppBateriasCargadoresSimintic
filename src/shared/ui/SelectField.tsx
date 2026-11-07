import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  type SelectProps,
} from 'react-aria-components';

import styles from './SelectField.module.css';

export interface OpcionSelect {
  readonly id: string;
  readonly texto: string;
}

export interface SelectFieldProps extends Omit<SelectProps, 'className' | 'children'> {
  readonly etiqueta: string;
  readonly error?: string | undefined;
  readonly items: readonly OpcionSelect[];
  readonly textoVacio?: string;
}

export function SelectField({
  etiqueta,
  error,
  items,
  textoVacio = 'Selecciona...',
  ...props
}: SelectFieldProps): React.JSX.Element {
  return (
    <Select
      {...props}
      placeholder={textoVacio}
      isInvalid={Boolean(error)}
      className={styles.campo!}
    >
      <Label className={styles.etiqueta!}>{etiqueta}</Label>
      <Button className={styles.selector!}>
        <SelectValue className={styles.valor!} />
        <span aria-hidden="true" className={styles.flecha!}>
          &#9662;
        </span>
      </Button>
      <Popover className={styles.popover!}>
        <ListBox className={styles.lista!}>
          {items.map((item) => (
            <ListBoxItem key={item.id} id={item.id} className={styles.opcion!}>
              {item.texto}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
      {error ? <span className={styles.error!}>{error}</span> : null}
    </Select>
  );
}
