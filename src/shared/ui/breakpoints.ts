export const BREAKPOINTS = {
  compacto: 0,
  medio: 600,
  expandido: 1023,
  amplio: 1440,
} as const;

export const ANCHO_MAXIMO_CONTENIDO = 1280;

export type Breakpoint = 'compacto' | 'medio' | 'expandido' | 'amplio';

export const MEDIA = {
  medio: `(min-width: ${BREAKPOINTS.medio}px)`,
  expandido: `(min-width: ${BREAKPOINTS.expandido}px)`,
  amplio: `(min-width: ${BREAKPOINTS.amplio}px)`,
} as const;
