import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components';
import { useEffect, useState } from 'react';

import styles from './ComboboxField.module.css';

export interface OpcionCombo {
  readonly id: string;
  readonly texto: string;
}

interface Props {
  readonly etiqueta: string;
  readonly valor: string;
  readonly items: readonly OpcionCombo[];
  readonly permiteTextoLibre?: boolean;
  readonly placeholder?: string | undefined;
  readonly ayuda?: string | undefined;
  readonly error?: string | undefined;
  readonly onCambio: (valor: string, opcion?: OpcionCombo) => void;
}

const sinTildes = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function ComboboxField({
  etiqueta,
  valor,
  items,
  permiteTextoLibre = false,
  placeholder,
  ayuda,
  error,
  onCambio,
}: Props): React.JSX.Element {
  const [texto, setTexto] = useState(valor);
  const idError = error ? `combo-${etiqueta}-error` : undefined;
  const idAyuda = ayuda ? `combo-${etiqueta}-ayuda` : undefined;
  const descritoPor = [idError, idAyuda].filter(Boolean).join(' ');
  const seleccionado = items.find((item) => item.texto === valor)?.id ?? null;

  useEffect(() => {
    setTexto(valor);
  }, [valor]);

  return (
    <ComboBox
      className={styles.campo!}
      allowsCustomValue={permiteTextoLibre}
      inputValue={texto}
      onInputChange={(nuevo) => {
        setTexto(nuevo);
        if (permiteTextoLibre) onCambio(nuevo);
      }}
      selectedKey={seleccionado}
      onSelectionChange={(clave) => {
        if (clave === null) return;
        const opcion = items.find((item) => item.id === String(clave));
        if (opcion) {
          setTexto(opcion.texto);
          onCambio(opcion.texto, opcion);
        }
      }}
    >
      <Label className={styles.etiqueta!}>{etiqueta}</Label>
      <div className={styles.control!}>
        <Input
          className={styles.entrada!}
          {...(placeholder !== undefined ? { placeholder } : {})}
          {...(descritoPor ? { 'aria-describedby': descritoPor } : {})}
        />

        <Button className={styles.disparador!} aria-label="Mostrar opciones">
          &#9662;
        </Button>
      </div>
      <Popover className={styles.popover!}>
        <ListBox className={styles.lista!}>
          {items
            .filter((item) => sinTildes(item.texto).includes(sinTildes(texto)))
            .map((item) => (
              <ListBoxItem
                key={item.id}
                id={item.id}
                textValue={item.texto}
                className={styles.opcion!}
              >
                {item.texto}
              </ListBoxItem>
            ))}
        </ListBox>
      </Popover>
      {ayuda ? (
        <span id={idAyuda} className={styles.ayuda!}>
          {ayuda}
        </span>
      ) : null}
      {error ? (
        <span id={idError} className={styles.error!}>
          {error}
        </span>
      ) : null}
    </ComboBox>
  );
}
