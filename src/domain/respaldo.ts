export interface Manifiesto {
  version: string;
  esquemaDb: number;
  app_version: string;
  dispositivo_id: string;
  fecha: string;
  servicios_pendientes: number;
  adjuntos_totales: number;
}

export interface RespaldoValidationResult {
  ok: boolean;
  error?: string;
}

const SCHEMA_DB_VERSION = 1;
const COMPATIBLE_VERSIONS = ['1.0.0'];

export function validarManifiesto(data: unknown): RespaldoValidationResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Manifiesto no es un objeto válido' };
  }

  const m = data as Record<string, unknown>;

  // Verificar campos obligatorios
  if (!m.version || typeof m.version !== 'string') {
    return { ok: false, error: 'Campo version faltante o inválido' };
  }

  if (m.esquemaDb === undefined || typeof m.esquemaDb !== 'number') {
    return { ok: false, error: 'Campo esquemaDb faltante o inválido' };
  }

  // Verificar compatibilidad de esquema
  if (m.esquemaDb > SCHEMA_DB_VERSION) {
    return {
      ok: false,
      error: `Esquema de respaldo incompatible (v${m.esquemaDb}, esperado ≤${SCHEMA_DB_VERSION})`,
    };
  }

  if (!COMPATIBLE_VERSIONS.includes(m.version as string)) {
    return { ok: false, error: `Versión de respaldo no soportada: ${m.version}` };
  }

  // Campos opcionales pero validables
  if (m.servicios_pendientes !== undefined && typeof m.servicios_pendientes !== 'number') {
    return { ok: false, error: 'Campo servicios_pendientes inválido' };
  }

  if (m.servicios_pendientes && m.servicios_pendientes < 0) {
    return { ok: false, error: 'servicios_pendientes no puede ser negativo' };
  }

  return { ok: true };
}

export function crearManifiesto(
  app_version: string,
  dispositivo_id: string,
  servicios_pendientes: number,
  adjuntos_totales: number,
  ahora: Date = new Date()
): Manifiesto {
  return {
    version: '1.0.0',
    esquemaDb: SCHEMA_DB_VERSION,
    app_version,
    dispositivo_id,
    fecha: ahora.toISOString(),
    servicios_pendientes,
    adjuntos_totales,
  };
}
