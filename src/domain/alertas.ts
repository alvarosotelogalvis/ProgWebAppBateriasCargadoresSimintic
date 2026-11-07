export type NivelAlerta = '90' | '60' | '30' | 'VENCIDA' | null;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Días completos entre hoy y la fecha indicada (ISO `yyyy-MM-dd`). */
export const diasRestantes = (fecha: string, hoy: string): number => {
  const objetivo = Date.parse(`${fecha}T00:00:00Z`);
  const actual = Date.parse(`${hoy}T00:00:00Z`);
  if (Number.isNaN(objetivo) || Number.isNaN(actual)) return Number.NaN;
  return Math.round((objetivo - actual) / MS_POR_DIA);
};

/** Umbrales en días, de mayor a menor (p. ej. [90, 60, 30]). */
export const nivelAlerta = (
  dias: number,
  umbrales: readonly number[] = [90, 60, 30]
): NivelAlerta => {
  if (!Number.isFinite(dias)) return null;
  if (dias < 0) return 'VENCIDA';
  const ordenados = [...umbrales].filter((umbral) => Number.isFinite(umbral)).sort((a, b) => a - b);
  for (const umbral of ordenados) {
    if (dias <= umbral) return String(umbral) as NivelAlerta;
  }
  return null;
};
