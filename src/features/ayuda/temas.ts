/** Temas de la ayuda in-app, en el orden en que se listan. Cada uno vive en `ayuda.json`. */
export const TEMAS_AYUDA = [
  'instalar',
  'sin-conexion',
  'etapas-servicio',
  'adjuntar-pdf',
  'corregir-anular',
  'preguntas-frecuentes',
] as const;

export type TemaAyuda = (typeof TEMAS_AYUDA)[number];

export const esTemaAyuda = (valor: string | undefined): valor is TemaAyuda =>
  TEMAS_AYUDA.includes(valor as TemaAyuda);
