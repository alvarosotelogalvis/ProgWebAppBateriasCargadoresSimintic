import { generarCodigo } from '../codigo';
import { mergeTresVias } from '../merge';
import type { CamposServicio, DatosRemotosServicio, Servicio } from '../servicio';
import { debeDescargarse } from './retencion';
import type { RemotoCambio } from './remoto';

export type DecisionCambio =
  | { readonly tipo: 'INSERTAR'; readonly servicio: Servicio }
  | { readonly tipo: 'SOBRESCRIBIR'; readonly servicio: Servicio }
  | { readonly tipo: 'COMBINAR'; readonly servicio: Servicio }
  | { readonly tipo: 'ELIMINAR_LOCAL' }
  | { readonly tipo: 'CONFLICTO_ELIMINACION'; readonly servicio: Servicio }
  | {
      readonly tipo: 'IGNORAR';
      readonly motivo: 'SIN_SERVICIO_ID' | 'FUERA_DE_RETENCION' | 'EN_CONFLICTO' | 'SIN_DATOS';
    };

export interface ContextoMerge {
  readonly ahora: Date;
  readonly retencionMeses: number;
}

const datosRemotos = (
  cambio: RemotoCambio,
  previo?: DatosRemotosServicio
): DatosRemotosServicio => ({
  itemId: cambio.itemId ?? previo?.itemId ?? '',
  eTag: cambio.eTag ?? previo?.eTag ?? '',
  modificadoEn: cambio.modified ?? previo?.modificadoEn ?? '',
  webUrl: cambio.webUrl ?? previo?.webUrl ?? '',
  ...(previo?.urlCarpeta !== undefined ? { urlCarpeta: previo.urlCarpeta } : {}),
});

/** Quita las claves `undefined` para respetar `exactOptionalPropertyTypes`. */
const sinIndefinidos = <T extends object>(objeto: T): T =>
  Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined)) as T;

const servicioNuevo = (cambio: RemotoCambio, ctx: ContextoMerge): Servicio | undefined => {
  const f = cambio.fields;
  if (
    f.tipoEquipo === undefined ||
    f.estado === undefined ||
    f.fechaRecepcion === undefined ||
    f.clienteId === undefined ||
    f.numeroSolicitud === undefined ||
    f.serie === undefined
  ) {
    return undefined;
  }
  const ahoraIso = ctx.ahora.toISOString();
  const meta = cambio.meta ?? {};
  const base: Servicio = {
    ...(sinIndefinidos(f) as Partial<CamposServicio>),
    tipoEquipo: f.tipoEquipo,
    estado: f.estado,
    fechaRecepcion: f.fechaRecepcion,
    clienteId: f.clienteId,
    clienteNombre: f.clienteNombre ?? '',
    numeroSolicitud: f.numeroSolicitud,
    marca: f.marca ?? '',
    referencia: f.referencia ?? '',
    serie: f.serie,
    id: cambio.servicioId,
    codigo: meta.codigo ?? '',
    capturadoPor: meta.capturadoPor ?? '',
    capturadoPorNombre: meta.capturadoPorNombre ?? '',
    creadoEn: meta.creadoEn ?? cambio.modified ?? ahoraIso,
    actualizadoEn: cambio.modified ?? ahoraIso,
    dispositivoId: meta.dispositivoId ?? '',
    appVersion: meta.appVersion ?? '',
    ...(meta.urlCarpetaAdjuntos !== undefined
      ? { urlCarpetaAdjuntos: meta.urlCarpetaAdjuntos }
      : {}),
    syncState: 'synced',
    camposSucios: [],
    base: sinIndefinidos(f),
    conflictos: [],
    intentos: 0,
    origen: 'remoto',
    ...(cambio.itemId !== undefined ? { sp: datosRemotos(cambio) } : {}),
  };
  if (base.codigo === '') base.codigo = generarCodigo(base);
  return base;
};

/**
 * Decide qué hacer con un cambio remoto frente a la copia local (FR-006-03 a FR-006-06).
 * Pura: no toca Dexie ni la red. Nunca pierde cambios locales pendientes (FR-006-14).
 */
export function aplicarCambioRemoto(
  local: Servicio | undefined,
  cambio: RemotoCambio,
  ctx: ContextoMerge
): DecisionCambio {
  if (!cambio.servicioId) return { tipo: 'IGNORAR', motivo: 'SIN_SERVICIO_ID' };

  if (cambio.deleted) {
    if (!local) return { tipo: 'IGNORAR', motivo: 'SIN_DATOS' };
    if (local.camposSucios.length > 0 || local.syncState !== 'synced') {
      return {
        tipo: 'CONFLICTO_ELIMINACION',
        servicio: {
          ...local,
          conflictos: [{ campo: 'estado', local: local.estado, remoto: undefined }],
          syncState: 'conflict',
        },
      };
    }
    return { tipo: 'ELIMINAR_LOCAL' };
  }

  if (!local) {
    if (!debeDescargarse(cambio, ctx.ahora, ctx.retencionMeses)) {
      return { tipo: 'IGNORAR', motivo: 'FUERA_DE_RETENCION' };
    }
    const servicio = servicioNuevo(cambio, ctx);
    return servicio ? { tipo: 'INSERTAR', servicio } : { tipo: 'IGNORAR', motivo: 'SIN_DATOS' };
  }

  // Un servicio en conflicto no se toca hasta que el usuario lo resuelva (ES-006-12).
  if (local.syncState === 'conflict') return { tipo: 'IGNORAR', motivo: 'EN_CONFLICTO' };

  if (local.camposSucios.length === 0) {
    const sinVaciados: Servicio = { ...local };
    for (const campo of cambio.vaciados ?? []) delete sinVaciados[campo];
    const servicio: Servicio = {
      ...sinVaciados,
      ...sinIndefinidos(cambio.fields),
      camposSucios: [],
      conflictos: [],
      // Sin campos sucios no hay nada que combinar; un estado pendiente por adjuntos se conserva.
      syncState: local.syncState,
      base: sinIndefinidos(cambio.fields),
      ...(cambio.itemId !== undefined ? { sp: datosRemotos(cambio, local.sp) } : {}),
    };
    servicio.codigo = local.codigo || generarCodigo(servicio);
    return { tipo: 'SOBRESCRIBIR', servicio };
  }

  const { servicio } = mergeTresVias(local, {
    ...sinIndefinidos(cambio.fields),
    ...(cambio.eTag !== undefined ? { eTag: cambio.eTag } : {}),
    ...(cambio.vaciados !== undefined ? { vaciados: cambio.vaciados } : {}),
  });
  const conSp: Servicio =
    cambio.itemId !== undefined ? { ...servicio, sp: datosRemotos(cambio, servicio.sp) } : servicio;
  return { tipo: 'COMBINAR', servicio: conSp };
}
