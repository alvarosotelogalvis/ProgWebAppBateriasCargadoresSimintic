import type { ReactNode } from 'react';

import styles from './TablaResponsive.module.css';

export interface ColumnaTabla<T> {
  readonly clave: keyof T & string;
  readonly etiqueta: string;
  /** Contenido propio de la celda (por defecto, el valor de `clave` como texto). */
  readonly celda?: (fila: T) => ReactNode;
}

interface TablaResponsiveProps<T> {
  readonly datos: readonly T[];
  readonly columnas: readonly ColumnaTabla<T>[];
  /** `expanded` pinta una tabla; `compact` y `medium`, una tarjeta por fila. */
  readonly breakpoint?: 'compact' | 'medium' | 'expanded';
  readonly etiqueta?: string;
}

const contenido = <T,>(fila: T, columna: ColumnaTabla<T>): ReactNode =>
  columna.celda ? columna.celda(fila) : String(fila[columna.clave] ?? '');

/**
 * Tabla responsiva (docs/10 §4.3): `<table>` con encabezados `th scope="col"` en expandido y
 * tarjetas apiladas con la etiqueta de cada columna en compacto y medio.
 */
export function TablaResponsive<T extends { readonly id?: string | number }>({
  datos,
  columnas,
  breakpoint = 'expanded',
  etiqueta,
}: TablaResponsiveProps<T>): React.JSX.Element {
  if (breakpoint === 'expanded') {
    return (
      <table className={styles.tabla!} aria-label={etiqueta}>
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th key={columna.clave} scope="col">
                {columna.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map((fila, indice) => (
            <tr key={fila.id ?? indice}>
              {columnas.map((columna) => (
                <td key={columna.clave}>{contenido(fila, columna)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <ul className={styles.tarjetas!} aria-label={etiqueta}>
      {datos.map((fila, indice) => (
        <li key={fila.id ?? indice} className={styles.tarjeta!} data-testid="tabla-tarjeta">
          {columnas.map((columna) => (
            <div key={columna.clave} className={styles.dato!}>
              <span className={styles.etiqueta!} data-testid="tarjeta-etiqueta">
                {columna.etiqueta}
              </span>
              <span className={styles.valor!}>{contenido(fila, columna)}</span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
