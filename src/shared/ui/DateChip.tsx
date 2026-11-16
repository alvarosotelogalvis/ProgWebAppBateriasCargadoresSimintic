import { useId } from 'react';

import styles from './DateChip.module.css';

interface Props {
  readonly etiqueta: string;
  readonly valor: string;
  readonly onCambio: (valor: string) => void;
  readonly max?: string | undefined;
  readonly error?: string | undefined;
  readonly id?: string;
}

export function DateChip({
  etiqueta,
  valor,
  onCambio,
  max,
  error,
  id: idExplicito,
}: Props): React.JSX.Element {
  // Sin `id` propio se genera uno: la etiqueta SIEMPRE debe quedar asociada al campo.
  const idGenerado = useId();
  const id = idExplicito ?? idGenerado;
  const idError = error ? `${id}-error` : undefined;
  return (
    <div className={styles.campo!}>
      <label className={styles.etiqueta!} htmlFor={id}>
        {etiqueta}
      </label>
      <input
        id={id}
        type="date"
        className={styles.entrada!}
        value={valor}
        max={max}
        onChange={(evento) => onCambio(evento.target.value)}
        aria-invalid={Boolean(error)}
        {...(idError ? { 'aria-describedby': idError } : {})}
      />
      {error ? (
        <span id={idError} className={styles.error!}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

interface RangoProps {
  readonly desde: string;
  readonly hasta: string;
  readonly onCambio: (desde: string, hasta: string) => void;
  readonly desdeEtiqueta: string;
  readonly hastaEtiqueta: string;
  readonly max?: string | undefined;
}

export function DateRangeFilter({
  desde,
  hasta,
  onCambio,
  desdeEtiqueta,
  hastaEtiqueta,
  max,
}: RangoProps): React.JSX.Element {
  return (
    <div className={styles.rango!}>
      <DateChip
        id="fecha-desde"
        etiqueta={desdeEtiqueta}
        valor={desde}
        max={max}
        onCambio={(valor) => onCambio(valor, hasta)}
      />
      <DateChip
        id="fecha-hasta"
        etiqueta={hastaEtiqueta}
        valor={hasta}
        max={max}
        onCambio={(valor) => onCambio(desde, valor)}
      />
    </div>
  );
}
