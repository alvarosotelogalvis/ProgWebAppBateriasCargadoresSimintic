import { mergeTresVias } from '../merge';
import { generarCodigo } from '../codigo';
import type { Servicio } from '../servicio';
import { debeDescargarse } from './retencion';
import type { RemotoCambio } from './remoto';

export type DecisionCambio =
  | { readonly tipo: 'INSERTAR'; readonly servicio: Servicio }
  | { readonly tipo: 'SOBRESCRIBIR'; readonly servicio: Servicio }
  | { readonly tipo: 'COMBINAR'; readonly servicio: Servicio }
  | { readonly tipo: 'ELIMINAR_LOCAL' }
  | { readonly tipo: 'CONFLICTO_ELIMINACION'; readonly servicio: Servicio }
  | { readonly tipo: 'IGNORAR'; readonly motivo: 'SIN_SERVICIO_ID' | 'FUERA_DE_RETENCION' };

interface ContextoMerge {
  readonly ahora: Date;
  readonly retencionMeses: number;
}

/**
 * Decide qué hacer con un cambio remoto comparándolo con la copia local.
 * Retorna la decisión (insertar, sobrescribir, combinar, etc.).
 * FR-006-03 a FR-006-05 (ES-006-01 a ES-006-10)
 * (T-004, T-008)
 */
export function aplicarCambioRemoto(
  local: Servicio | undefined,
  cambio: RemotoCambio,
  ctx: ContextoMerge
): DecisionCambio {
  // Validar que tenga ServicioId
  if (!cambio.servicioId || typeof cambio.servicioId !== 'string') {
    return { tipo: 'IGNORAR', motivo: 'SIN_SERVICIO_ID' };
  }

  // Si no existe localmente, decidir si insertarlo
  if (!local) {
    if (!debeDescargarse(cambio, ctx.ahora, ctx.retencionMeses)) {
      return { tipo: 'IGNORAR', motivo: 'FUERA_DE_RETENCION' };
    }

    if (cambio.deleted) {
      // Cambio remoto de eliminación sin local: no hay nada que hacer
      return { tipo: 'IGNORAR', motivo: 'SIN_SERVICIO_ID' };
    }

    // Crear nuevo servicio sincronizado desde los campos remotos
    const servicio: Servicio = {
      id: cambio.servicioId,
      codigo: '', // Se genera después
      estado: (cambio.fields.estado ?? 'BORRADOR') as Servicio['estado'],
      tipoEquipo: (cambio.fields.tipoEquipo ?? 'BATERIA') as Servicio['tipoEquipo'],
      fechaRecepcion: (cambio.fields.fechaRecepcion ??
        new Date().toISOString().split('T')[0]) as string,
      clienteId: (cambio.fields.clienteId ?? 0) as number,
      clienteNombre: (cambio.fields.clienteNombre ?? '') as string,
      numeroSolicitud: (cambio.fields.numeroSolicitud ?? 0) as number,
      marca: (cambio.fields.marca ?? '') as string,
      referencia: (cambio.fields.referencia ?? '') as string,
      serie: (cambio.fields.serie ?? '') as string,
      diagnostico: cambio.fields.diagnostico as string | undefined,
      observacionTecnica: cambio.fields.observacionTecnica as string | undefined,
      capturadoPor: (cambio.fields.capturadoPor ?? '') as string,
      capturadoPorNombre: (cambio.fields.capturadoPorNombre ?? '') as string,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      dispositivoId: '',
      appVersion: (cambio.fields.appVersion ?? '0.1.0') as string,
      syncState: 'synced',
      camposSucios: [],
      base: cambio.fields as Record<string, unknown>,
      conflictos: [],
      intentos: 0,
      origen: 'remoto',
      sp: cambio.itemId
        ? {
            itemId: cambio.itemId,
            eTag: '',
            modificadoEn: cambio.modified ?? new Date().toISOString(),
            webUrl: '',
          }
        : undefined,
    };

    servicio.codigo = generarCodigo(servicio);

    return { tipo: 'INSERTAR', servicio };
  }

  // Existe localmente. Manejar eliminación remota.
  if (cambio.deleted) {
    if (local.camposSucios.length > 0) {
      // Hay cambios pendientes: conflicto de eliminación
      return {
        tipo: 'CONFLICTO_ELIMINACION',
        servicio: {
          ...local,
          conflictos: [
            {
              campo: 'estado',
              local: local.estado,
              remoto: undefined,
            },
          ],
          syncState: 'conflict',
        },
      };
    }

    // Sin cambios pendientes: eliminar localmente
    return { tipo: 'ELIMINAR_LOCAL' };
  }

  // Existe localmente y no está eliminado remotamente. Aplicar merge o sobrescribir.
  if (local.camposSucios.length === 0) {
    // Sin cambios pendientes: sobrescribir
    const servicio: Servicio = {
      ...local,
      ...cambio.fields,
      camposSucios: [],
      conflictos: [],
      syncState: 'synced',
      base: cambio.fields as Record<string, unknown>,
      sp: cambio.itemId
        ? {
            itemId: cambio.itemId,
            eTag: '',
            modificadoEn: cambio.modified ?? new Date().toISOString(),
            webUrl: local.sp?.webUrl ?? '',
          }
        : local.sp,
    };

    servicio.codigo = generarCodigo(servicio);

    return { tipo: 'SOBRESCRIBIR', servicio };
  }

  // Con cambios pendientes: merge a 3 vías
  const { servicio } = mergeTresVias(local, cambio.fields as Record<string, unknown>);

  if (cambio.itemId && servicio.sp) {
    servicio.sp = {
      ...servicio.sp,
      itemId: cambio.itemId,
      modificadoEn: cambio.modified ?? new Date().toISOString(),
    };
  }

  return { tipo: 'COMBINAR', servicio };
}
