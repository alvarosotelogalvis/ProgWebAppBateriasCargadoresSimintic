import {
  Input,
  Label,
  TextArea,
  TextField as RACTextField,
  type TextFieldProps as RACTextFieldProps,
} from 'react-aria-components';
import { useId } from 'react';

import styles from './TextField.module.css';

export interface TextFieldProps extends Omit<RACTextFieldProps, 'className' | 'children'> {
  readonly etiqueta: string;
  readonly error?: string | undefined;
  readonly ayuda?: string | undefined;
  readonly multilinea?: boolean;
  readonly inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'search' | 'url';
  readonly autoCapitalize?: string;
  readonly placeholder?: string | undefined;
}

export function TextField({
  etiqueta,
  error,
  ayuda,
  multilinea = false,
  inputMode,
  autoCapitalize,
  placeholder,
  id: idExplicito,
  ...props
}: TextFieldProps): React.JSX.Element {
  const idGenerado = useId();
  const id = idExplicito ?? idGenerado;
  const idError = error ? `${id}-error` : undefined;
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const descritoPor = [idError, idAyuda].filter(Boolean).join(' ');

  return (
    <RACTextField {...props} isInvalid={Boolean(error)} className={styles.campo!}>
      <Label className={styles.etiqueta!}>{etiqueta}</Label>
      {multilinea ? (
        <TextArea
          className={styles.entrada!}
          rows={4}
          {...(placeholder !== undefined ? { placeholder } : {})}
          {...(descritoPor ? { 'aria-describedby': descritoPor } : {})}
        />
      ) : (
        <Input
          className={styles.entrada!}
          {...(placeholder !== undefined ? { placeholder } : {})}
          {...(inputMode !== undefined ? { inputMode } : {})}
          {...(autoCapitalize !== undefined ? { autoCapitalize } : {})}
          {...(descritoPor ? { 'aria-describedby': descritoPor } : {})}
        />
      )}
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
    </RACTextField>
  );
}
