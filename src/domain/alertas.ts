import type { Servicio } from './servicio';
import { fechaLocalHoy } from './validaciones';

/** Nivel de una alerta de vida útil. Los números son el nombre del nivel, no los días. */
export type NivelAlerta = 'vencida' | '90' | '60' | '30';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface ConfiguracionAlerta {
  diasAlerta90: number;
  diasAlerta60: number;
  diasAlerta30: number;
}

export interface Alerta {
  servicioId: string;
  codigo: string;
  cliente: string;
  serie: string;
  /** Fecha de fin de vida útil (`yyyy-MM-dd`). */
  proyeccionVidaUtil: string;
  nivel: NivelAlerta;
  /** Negativo cuando ya venció. */
  diasRestantes: number;
}

export const DEFAULT_UMBRALES: ConfiguracionAlerta = {
  diasAlerta90: 90,
  diasAlerta60: 60,
  diasAlerta30: 30,
};

/** Días completos entre hoy y la fecha indicada (ISO `yyyy-MM-dd`). */
export const diasRestantes = (fecha: string, hoy: string): number => {
  const objetivo = Date.parse(`${fecha}T00:00:00Z`);
  const actual = Date.parse(`${hoy}T00:00:00Z`);
  if (Number.isNaN(objetivo) || Number.isNaN(actual)) return Number.NaN;
  return Math.round((objetivo - actual) / MS_POR_DIA);
};

/**
 * Nivel según umbrales numéricos en días (p. ej. [90, 60, 30]); el nivel se nombra con el
 * umbral más pequeño que cubre los días restantes.
 */
export const nivelAlerta = (
  dias: number,
  umbrales: readonly number[] = [90, 60, 30]
): NivelAlerta | null => {
  if (!Number.isFinite(dias)) return null;
  if (dias < 0) return 'vencida';
  const ordenados = [...umbrales].filter((umbral) => Number.isFinite(umbral)).sort((a, b) => a - b);
  for (const umbral of ordenados) {
    if (dias <= umbral) return String(umbral) as NivelAlerta;
  }
  return null;
};

/** Nivel por "ranura": conserva el nombre 30/60/90 aunque los umbrales configurados cambien. */
const nivelPorRanura = (dias: number, umbrales: ConfiguracionAlerta): NivelAlerta | null => {
  if (!Number.isFinite(dias)) return null;
  if (dias < 0) return 'vencida';
  if (dias <= umbrales.diasAlerta30) return '30';
  if (dias <= umbrales.diasAlerta60) return '60';
  if (dias <= umbrales.diasAlerta90) return '90';
  return null;
};

const ESTADOS_CON_ALERTA: readonly Servicio['estado'][] = ['ENTREGADO', 'FACTURADO'];

/**
 * Servicios entregados o facturados cuya vida útil vence pronto o ya venció.
 * `hoy` (por defecto la fecha local) se inyecta para poder probar sin depender del reloj.
 */
export function filtrarAlertasActivas(
  servicios: readonly Servicio[],
  umbrales: ConfiguracionAlerta = DEFAULT_UMBRALES,
  hoy: string = fechaLocalHoy()
): Alerta[] {
  const alertas: Alerta[] = [];

  for (const servicio of servicios) {
    const vidaUtil = servicio.proyeccionVidaUtil;
    if (!ESTADOS_CON_ALERTA.includes(servicio.estado) || !vidaUtil) continue;

    const dias = diasRestantes(vidaUtil, hoy);
    const nivel = nivelPorRanura(dias, umbrales);
    if (!nivel) continue;

    alertas.push({
      servicioId: servicio.id,
      codigo: servicio.codigo,
      cliente: servicio.clienteNombre,
      serie: servicio.serie,
      proyeccionVidaUtil: vidaUtil,
      nivel,
      diasRestantes: dias,
    });
  }

  return alertas;
}
