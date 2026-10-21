interface VentanaConStandalone {
  readonly matchMedia: (consulta: string) => { readonly matches: boolean };
  readonly navigator: { readonly standalone?: boolean };
}

/**
 * Detecta si la app se esta ejecutando en modo standalone (instalada).
 * Cubre los tres casos: display-mode de CSS, el estandar de iOS y MS standalone.
 */
export function esStandalone(w: VentanaConStandalone): boolean {
  if (w.navigator.standalone === true) {
    return true;
  }

  try {
    return w.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

/** Igual que `esStandalone` pero tolerante al tipo real de `window`. */
export function esStandaloneEnVentana(w: Window & typeof globalThis): boolean {
  return esStandalone({
    matchMedia: (consulta) => w.matchMedia(consulta),
    navigator: w.navigator as unknown as { readonly standalone?: boolean },
  });
}
