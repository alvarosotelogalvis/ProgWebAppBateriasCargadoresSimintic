import type { Servicio } from './servicio';

export type NivelAlerta = 'vencida' | '90' | '60' | '30' | null;

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
  proyeccionVidaUtil: Date;
  nivel: NivelAlerta;
  diasRestantes: number;
  textoFecha: string; // "Venció hace N días" o "Vence en N días"
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

/** Umbrales en días, de mayor a menor (p. ej. [90, 60, 30]). */
export const nivelAlerta = (
  dias: number,
  umbrales: readonly number[] = [90, 60, 30]
): NivelAlerta => {
  if (!Number.isFinite(dias)) return null;
  if (dias < 0) return 'vencida';
  const ordenados = [...umbrales].filter((umbral) => Number.isFinite(umbral)).sort((a, b) => a - b);
  for (const umbral of ordenados) {
    if (dias <= umbral) return String(umbral) as NivelAlerta;
  }
  return null;
};

export function calcularNivelAlertaDesdeDate(
  fechaProyectada: Date | null | undefined,
  umbrales: ConfiguracionAlerta = DEFAULT_UMBRALES
): NivelAlerta {
  if (!fechaProyectada) return null;
  const dias = diasRestantesDesdeDate(fechaProyectada);
  return nivelAlerta(dias, [umbrales.diasAlerta90, umbrales.diasAlerta60, umbrales.diasAlerta30]);
}

export function diasRestantesDesdeDate(fecha: Date): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(0, 0, 0, 0);
  const diferencia = fin.getTime() - hoy.getTime();
  return Math.ceil(diferencia / MS_POR_DIA);
}

export function formatearTextoFecha(dias: number): string {
  if (dias < 0) {
    return `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`;
  }
  return `Vence en ${dias} día${dias !== 1 ? 's' : ''}`;
}

export function filtrarAlertasActivas(
  servicios: Servicio[],
  umbrales: ConfiguracionAlerta = DEFAULT_UMBRALES
): Alerta[] {
  const estados_validos = ['ENTREGADO', 'FACTURADO'];
  const mapa_alertas = new Map<string, Alerta>();

  for (const s of servicios) {
    if (!estados_validos.includes(s.estado) || !s.proyeccionVidaUtil) {
      continue;
    }

    const nivel = calcularNivelAlertaDesdeDate(s.proyeccionVidaUtil, umbrales);
    if (!nivel) continue;

    const dias = diasRestantesDesdeDate(s.proyeccionVidaUtil);
    const textoFecha = formatearTextoFecha(dias);

    const alerta: Alerta = {
      servicioId: s.id,
      codigo: s.codigo,
      cliente: s.clienteNombre,
      serie: s.serie,
      proyeccionVidaUtil: s.proyeccionVidaUtil,
      nivel,
      diasRestantes: dias,
      textoFecha,
    };

    const existente = mapa_alertas.get(s.id);
    if (!existente || nivelPrioridad(nivel) > nivelPrioridad(existente.nivel)) {
      mapa_alertas.set(s.id, alerta);
    }
  }

  return Array.from(mapa_alertas.values());
}

function nivelPrioridad(nivel: NivelAlerta): number {
  const prioridades: Record<NivelAlerta, number> = {
    vencida: 4,
    '30': 3,
    '60': 2,
    '90': 1,
    null: 0,
  };
  return prioridades[nivel];
}
