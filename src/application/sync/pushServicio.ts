import type { Adjunto } from '@/domain/adjunto';
import type { CamposServicio, Servicio } from '@/domain/servicio';
import { rutaCarpeta, nombreArchivo } from '@/domain/sync/rutas';
import { AppError } from '@/shared/errors';

import type { MapeadorServicio } from '../ports/mapeadorServicio';
import type { RemoteGatewayPush, ServicioRemotoPush } from '../ports/RemoteGatewayPush';
import type { Uploader } from '../ports/UploaderPort';

export interface PushServicioDeps {
  readonly remoto: RemoteGatewayPush;
  readonly uploader: Uploader;
  readonly mapeador: MapeadorServicio;
  readonly ahoraIso: () => string;
  readonly signal?: AbortSignal;
  readonly onProgreso?: (adjunto: Adjunto, bytesEnviados: number, bytesTotales: number) => void;
  /** Persiste el estado del adjunto (avance, sesión o sincronizado). */
  readonly onAdjuntoGuardar?: (adjunto: Adjunto) => Promise<void>;
  readonly onAdjuntoEliminar?: (adjuntoId: string) => Promise<void>;
}

export interface ResultadoPushServicio {
  readonly sp: NonNullable<Servicio['sp']>;
  /** Valores exactos que se enviaron, para conservar ediciones posteriores. */
  readonly camposEnviados: ReadonlyMap<keyof CamposServicio, unknown>;
  /** Valores que tenía el ítem remoto al empezar (base del merge). */
  readonly baseRemota: Partial<CamposServicio>;
  readonly archivosSubidos: number;
  readonly adjuntos: readonly Adjunto[];
}

const CONCURRENCIA_ARCHIVOS = 2;

const estaDefinido = (valor: unknown): boolean => valor !== undefined && valor !== null;

/** Marca los valores sucios que se enviarán después de asegurar el ítem remoto. */
function snapshotSucios(servicio: Servicio): Map<keyof CamposServicio, unknown> {
  const enviados = new Map<keyof CamposServicio, unknown>();
  for (const campo of servicio.camposSucios) {
    const valor = servicio[campo];
    if (estaDefinido(valor)) enviados.set(campo, valor);
  }
  return enviados;
}

function spDesdeRemoto(
  remoto: ServicioRemotoPush,
  anterior: Servicio['sp'],
  ahoraIso: () => string
): NonNullable<Servicio['sp']> {
  return {
    itemId: remoto.id,
    eTag: remoto.eTag ?? anterior?.eTag ?? '',
    modificadoEn: remoto.modificadoEn ?? anterior?.modificadoEn ?? ahoraIso(),
    webUrl: remoto.webUrl ?? anterior?.webUrl ?? '',
    ...(anterior?.urlCarpeta ? { urlCarpeta: anterior.urlCarpeta } : {}),
  };
}

async function asegurarRemoto(
  servicio: Servicio,
  deps: PushServicioDeps
): Promise<ServicioRemotoPush> {
  if (servicio.sp?.itemId) {
    return {
      id: servicio.sp.itemId,
      fields: {},
      ...(servicio.sp.eTag ? { eTag: servicio.sp.eTag } : {}),
      ...(servicio.sp.webUrl ? { webUrl: servicio.sp.webUrl } : {}),
      ...(servicio.sp.modificadoEn ? { modificadoEn: servicio.sp.modificadoEn } : {}),
    };
  }

  const existente = await deps.remoto.buscarServicioPorId(servicio.id);
  if (existente) return existente;

  // Si el POST choca con el valor único ServicioId, el gateway recupera el
  // ítem existente; por eso después se aplican igual los campos sucios.
  return deps.remoto.crearServicio(deps.mapeador.aCamposSP(servicio));
}

async function eliminarMarcados(adjuntos: Adjunto[], deps: PushServicioDeps): Promise<Adjunto[]> {
  const restantes: Adjunto[] = [];
  for (const adjunto of adjuntos) {
    if (!adjunto.eliminarRemoto) {
      restantes.push(adjunto);
      continue;
    }
    if (adjunto.sp?.driveItemId) {
      try {
        await deps.remoto.eliminarArchivo(adjunto.sp.driveItemId);
      } catch (error) {
        const estado = error instanceof AppError ? error.estadoHttp : undefined;
        if (estado !== 404) throw error;
      }
    }
    await deps.onAdjuntoEliminar?.(adjunto.id);
  }
  return restantes;
}

async function subirAdjunto(
  servicio: Servicio,
  adjunto: Adjunto,
  deps: PushServicioDeps
): Promise<Adjunto> {
  if (!adjunto.blob) {
    throw new AppError({
      codigo: 'SP_NO_ENCONTRADO',
      mensaje: `El adjunto ${adjunto.nombreArchivo} no tiene contenido local para subir.`,
      reintentable: false,
    });
  }

  const ruta = `${rutaCarpeta(servicio)}/${nombreArchivo(servicio, adjunto)}`;
  const subido = await deps.uploader.subir(adjunto.blob, ruta, {
    ...(deps.signal ? { signal: deps.signal } : {}),
    ...(adjunto.uploadSession ? { sesion: adjunto.uploadSession } : {}),
    onProgreso: (enviados, totales) => {
      deps.onProgreso?.(adjunto, enviados, totales);
    },
    onSesion: async (sesion) => {
      const conSesion: Adjunto = { ...adjunto, ...(sesion ? { uploadSession: sesion } : {}) };
      if (!sesion) delete conSesion.uploadSession;
      await deps.onAdjuntoGuardar?.(conSesion);
    },
  });

  await deps.remoto.actualizarMetadatosArchivo(subido.id, {
    ServicioId: servicio.id,
    AdjuntoId: adjunto.id,
    TipoAdjunto: deps.mapeador.valorTipoAdjunto(adjunto.tipo),
    FechaCaptura: adjunto.capturadoEn,
    CapturadoPor: adjunto.capturadoPor,
  });

  const sincronizado: Adjunto = {
    ...adjunto,
    sp: {
      driveItemId: subido.id,
      webUrl: subido.webUrl ?? '',
      eTag: subido.eTag ?? '',
    },
    syncState: 'synced',
    sincronizadoEn: deps.ahoraIso(),
  };
  delete sincronizado.uploadSession;
  await deps.onAdjuntoGuardar?.(sincronizado);
  return sincronizado;
}

async function conConcurrencia<T>(
  items: readonly T[],
  limite: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let siguiente = 0;
  let fallo: unknown;
  const trabajador = async (): Promise<void> => {
    while (fallo === undefined) {
      const indice = siguiente;
      siguiente += 1;
      const item = items[indice];
      if (item === undefined) return;
      try {
        await fn(item);
      } catch (error) {
        fallo = error;
        return;
      }
    }
  };

  const trabajadores = Array.from({ length: Math.min(limite, items.length) }, () => trabajador());
  await Promise.all(trabajadores);
  if (fallo !== undefined) throw fallo;
}

/**
 * Push de un servicio (SDD §9.2, secciones 1–3):
 * asegurar el ítem remoto → eliminar adjuntos marcados → subir adjuntos → PATCH
 * de los campos sucios con la instantánea tomada al empezar.
 */
export async function pushServicio(
  servicio: Servicio,
  adjuntosEntrada: readonly Adjunto[],
  deps: PushServicioDeps
): Promise<ResultadoPushServicio> {
  const remoto = await asegurarRemoto(servicio, deps);
  const sp = spDesdeRemoto(remoto, servicio.sp, deps.ahoraIso);
  const camposEnviados = snapshotSucios(servicio);
  const baseRemota: Partial<CamposServicio> =
    Object.keys(remoto.fields).length > 0 ? deps.mapeador.deCamposSP(remoto.fields) : {};

  let adjuntos = await eliminarMarcados([...adjuntosEntrada], deps);
  let archivosSubidos = 0;
  const pendientes = adjuntos.filter(
    (adjunto) => (adjunto.syncState === 'pending' || adjunto.syncState === 'error') && adjunto.blob
  );

  await conConcurrencia(pendientes, CONCURRENCIA_ARCHIVOS, async (adjunto) => {
    const sincronizado = await subirAdjunto(servicio, adjunto, deps);
    adjuntos = adjuntos.map((actual) => (actual.id === sincronizado.id ? sincronizado : actual));
    archivosSubidos += 1;
  });

  if (camposEnviados.size > 0) {
    const resultado = await deps.remoto.actualizarServicio(
      sp.itemId,
      deps.mapeador.aCamposSP(servicio, [...camposEnviados.keys()]),
      sp.eTag
    );
    if (resultado.eTag) sp.eTag = resultado.eTag;
  }

  return { sp, camposEnviados, baseRemota, archivosSubidos, adjuntos };
}
