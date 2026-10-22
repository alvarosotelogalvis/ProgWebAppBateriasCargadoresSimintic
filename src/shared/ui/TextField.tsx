import {
  TextField as RACTextField,
  type TextFieldProps as RACTextFieldProps,
} from 'react-aria-components';

import styles from './TextField.module.css';

export interface TextFieldProps extends Omit<RACTextFieldProps, 'className' | 'children'> {
  readonly etiqueta: string;
  readonly error?: string;
  readonly ayuda?: string;
  readonly multilinea?: boolean;
  readonly placeholder?: string;
}

export function TextField({
  etiqueta,
  error,
  ayuda,
  multilinea = false,
  placeholder,
  ...props
}: TextFieldProps): React.JSX.Element {
  const base = props.id ?? 'campo';
  const idError = error ? `${base}-error` : undefined;
  const idAyuda = ayuda ? `${base}-ayuda` : undefined;
  const descritoPor = [idError, idAyuda].filter(Boolean).join(' ');

  return (
    <RACTextField
      {...props}
      isInvalid={Boolean(error)}
      className={styles.campo!}
      {...(descritoPor ? { 'aria-describedby': descritoPor } : {})}
    >
      <label className={styles.etiqueta!}>{etiqueta}</label>
      {multilinea ? (
        <textarea className={styles.entrada!} rows={4} placeholder={placeholder} />
      ) : (
        <input className={styles.entrada!} placeholder={placeholder} />
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
