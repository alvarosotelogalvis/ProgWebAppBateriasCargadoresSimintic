import { useEffect, useState } from 'react';

import { BREAKPOINTS, type Breakpoint } from '@/shared/ui/breakpoints';

const CONSULTAS: ReadonlyArray<{ breakpoint: Breakpoint; consulta: string }> = [
  { breakpoint: 'amplio', consulta: `(min-width: ${BREAKPOINTS.amplio}px)` },
  { breakpoint: 'expandido', consulta: `(min-width: ${BREAKPOINTS.expandido}px)` },
  { breakpoint: 'medio', consulta: `(min-width: ${BREAKPOINTS.medio}px)` },
];

function desdeAncho(ancho: number): Breakpoint {
  if (ancho >= BREAKPOINTS.amplio) return 'amplio';
  if (ancho >= BREAKPOINTS.expandido) return 'expandido';
  if (ancho >= BREAKPOINTS.medio) return 'medio';
  return 'compacto';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    desdeAncho(typeof window === 'undefined' ? 0 : window.innerWidth)
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (typeof window.matchMedia === 'function') {
      const mqls = CONSULTAS.map(({ breakpoint: bp, consulta }) => ({
        bp,
        mql: window.matchMedia(consulta),
      }));

      const calcular = (): void => {
        const activo = mqls.find((item) => item.mql.matches);
        setBreakpoint(activo ? activo.bp : 'compacto');
      };

      calcular();

      for (const { mql } of mqls) {
        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', calcular);
        } else if (typeof (mql as MediaQueryList).addListener === 'function') {
          (mql as MediaQueryList).addListener(calcular);
        }
      }

      return () => {
        for (const { mql } of mqls) {
          if (typeof mql.removeEventListener === 'function') {
            mql.removeEventListener('change', calcular);
          } else if (typeof (mql as MediaQueryList).removeListener === 'function') {
            (mql as MediaQueryList).removeListener(calcular);
          }
        }
      };
    }

    const calcular = (): void => setBreakpoint(desdeAncho(window.innerWidth));
    calcular();
    window.addEventListener('resize', calcular);
    return () => window.removeEventListener('resize', calcular);
  }, []);

  return breakpoint;
}
