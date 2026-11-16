import {
  detectarPlataforma,
  requiereInstalacion,
  type Plataforma,
  type RequisitoInstalacion,
} from './plataforma';
import { esStandaloneEnVentana } from './standalone';

interface NavigatorConUAData extends Navigator {
  readonly userAgentData?: {
    readonly platform?: string;
    readonly brands?: ReadonlyArray<{ readonly brand: string }>;
  };
}

export interface EstadoInstalacion {
  readonly plataforma: Plataforma;
  readonly standalone: boolean;
  readonly requisito: RequisitoInstalacion;
}

/** Plataforma, si la app corre instalada y qué se exige (FR-001-04): bloquear, advertir o nada. */
export function evaluarInstalacion(ventana: Window & typeof globalThis): EstadoInstalacion {
  const nav = ventana.navigator as NavigatorConUAData;
  const standalone = esStandaloneEnVentana(ventana);
  const plataforma = detectarPlataforma(nav.userAgent, nav.userAgentData);
  return { plataforma, standalone, requisito: requiereInstalacion(plataforma, standalone) };
}
