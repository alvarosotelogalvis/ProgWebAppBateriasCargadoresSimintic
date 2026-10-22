export type EscalaFuente = 1 | 1.15 | 1.3;

export const ESCALAS_FUENTE: ReadonlyArray<{ valor: EscalaFuente; etiqueta: string }> = [
  { valor: 1, etiqueta: 'normal' },
  { valor: 1.15, etiqueta: 'grande' },
  { valor: 1.3, etiqueta: 'muy-grande' },
];

export const VARIABLE_ESCALA = '--escala-fuente';

/**
 * Fija la escala de fuente en el elemento raiz. Se aplica antes del primer render
 * para evitar saltos de maquetacion (plan 001, seccion 3.4).
 */
export function aplicarEscalaFuente(escala: EscalaFuente, root?: HTMLElement): void {
  const elemento = root ?? document.documentElement;
  elemento.style.setProperty(VARIABLE_ESCALA, String(escala));
}
