/**
 * Tabla responsiva: <table> en expandido (≥768px), tarjetas en compacto/medio
 * Sistema de diseño docs/10 §4.3
 * T-020
 */

interface ColumnaTabla<T> {
  readonly clave: keyof T;
  readonly etiqueta: string;
}

interface TablaResponsiveProps<T> {
  readonly datos: readonly T[];
  readonly columnas: readonly ColumnaTabla<T>[];
  readonly breakpoint?: 'compact' | 'medium' | 'expanded';
}

export function TablaResponsive<T extends { readonly id?: string | number }>({
  datos,
  columnas,
  breakpoint = 'expanded',
}: TablaResponsiveProps<T>) {
  if (breakpoint === 'expanded') {
    return (
      <table role="table">
        <thead>
          <tr>
            {columnas.map((col) => (
              <th key={String(col.clave)} scope="col">
                {col.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map((fila, idx) => (
            <tr key={fila.id ?? idx}>
              {columnas.map((col) => (
                <td key={String(col.clave)}>{String(fila[col.clave] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Compacto/medio: tarjetas
  return (
    <div>
      {datos.map((fila, idx) => (
        <div key={fila.id ?? idx} data-testid="tabla-tarjeta">
          {columnas.map((col) => (
            <div key={String(col.clave)}>
              <span data-testid="tarjeta-etiqueta">{col.etiqueta}</span>
              <span>{String(fila[col.clave] ?? '')}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
