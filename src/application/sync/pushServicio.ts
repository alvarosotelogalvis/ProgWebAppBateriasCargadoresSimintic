import type { Adjunto } from '@/domain/adjunto';
import { generarCodigo } from '@/domain/codigo';
import type { CamposServicio, Servicio } from '@/domain/servicio';
import {
  compararIdsItem,
  esPendiente,
  MAX_INTENTOS_NUMERO,
  siguienteNumero,
} from '@/domain/sync/numeroSolicitud';
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
  /** Pausa entre reintentos al asignar el número (inyectable para las pruebas). */
  readonly pausa?: (ms: number) => Promise<void>;
  /** Fuente de aleatoriedad de la pausa (0 ≤ x < 1). */
  readonly aleatorio?: () => number;
  /** Aviso (para el log) de cada reintento por choque de número de solicitud. */
  readonly alReintentarNumero?: (info: {
    readonly motivo: 'choque' | 'verificacion';
    readonly intento: number;
    readonly numero: number;
  }) => void;
}

export interface ResultadoPushServicio {
  readonly sp: NonNullable<Servicio['sp']>;
  /** Valores exactos que se enviaron, para conservar ediciones posteriores. */
  readonly camposEnviados: ReadonlyMap<keyof CamposServicio, unknown>;
  /** Valores que tenía el ítem remoto al empezar (base del merge). */
  readonly baseRemota: Partial<CamposServicio>;
  readonly archivosSubidos: number;
  readonly adjuntos: readonly Adjunto[];
  /** Número de solicitud asignado (o adoptado de SharePoint) en esta subida; ausente si ya lo tenía. */
  readonly numeroSolicitud?: number;
}

const CONCURRENCIA_ARCHIVOS = 2;

const estaDefinido = (valor: unknown): boolean => valor !== undefined && valor !== null;

/**
 * Marca los valores sucios que se enviarán después de asegurar el ítem remoto.
 * Un campo que se vació (`undefined`) también se envía: el gateway lo manda como `null`.
 */
function snapshotSucios(servicio: Servicio): Map<keyof CamposServicio, unknown> {
  const enviados = new Map<keyof CamposServicio, unknown>();
  for (const campo of servicio.camposSucios) {
    const valor = servicio[campo];
    enviados.set(campo, estaDefinido(valor) ? valor : undefined);
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

interface RemotoAsegurado {
  readonly remoto: ServicioRemotoPush;
  /** Servicio con el número y el código definitivos (si se asignó o adoptó uno). */
  readonly servicio: Servicio;
  readonly numeroSolicitud?: number;
}

const conNumero = (servicio: Servicio, numero: number): Servicio => ({
  ...servicio,
  numeroSolicitud: numero,
  codigo: generarCodigo({ ...servicio, numeroSolicitud: numero }),
});

const esperar = (ms: number): Promise<void> =>
  new Promise((resolver) => {
    setTimeout(resolver, ms);
  });

/** Pausa aleatoria de 50 a 350 ms para que dos dispositivos no choquen siempre a la vez. */
const pausarAleatoria = (deps: PushServicioDeps): Promise<void> =>
  (deps.pausa ?? esperar)(50 + Math.floor((deps.aleatorio?.() ?? Math.random()) * 300));

const esChoqueDeNumero = (error: unknown): boolean =>
  error instanceof AppError && error.codigo === 'SP_NUMERO_DUPLICADO';

const errorSinNumero = (causa: unknown): AppError =>
  new AppError({
    codigo: 'SP_SERVIDOR',
    mensaje: 'No se pudo asignar un número de solicitud único. Se reintentará.',
    reintentable: true,
    causa,
  });

/**
 * La unicidad de SharePoint llega 1–4 s tarde (spike S9): dos dispositivos pueden crear el mismo número sin
 * error. Se comprueba después de crear: si hay un ítem anterior (id menor) con el mismo número, este pierde
 * y toma el siguiente. Devuelve el servicio con su número definitivo y el eTag vigente del ítem.
 */
async function verificarNumeroUnico(
  remoto: ServicioRemotoPush,
  candidato: Servicio,
  deps: PushServicioDeps
): Promise<{ servicio: Servicio; remoto: ServicioRemotoPush }> {
  let actual = candidato;
  let vigente = remoto;
  let ultimo: unknown;
  for (let intento = 1; intento <= MAX_INTENTOS_NUMERO; intento += 1) {
    const items = await deps.remoto.contarPorNumeroSolicitud(actual.numeroSolicitud);
    const hayAnterior = items.some(
      (item) => item.itemId !== vigente.id && compararIdsItem(item.itemId, vigente.id) < 0
    );
    if (!hayAnterior) return { servicio: actual, remoto: vigente };

    deps.alReintentarNumero?.({
      motivo: 'verificacion',
      intento,
      numero: actual.numeroSolicitud,
    });
    const nuevo = conNumero(candidato, siguienteNumero(await deps.remoto.ultimoNumeroSolicitud()));
    try {
      const resultado = await deps.remoto.renumerarServicio(
        vigente.id,
        nuevo.numeroSolicitud,
        nuevo.codigo
      );
      actual = nuevo;
      if (resultado.eTag) vigente = { ...vigente, eTag: resultado.eTag };
    } catch (error) {
      if (!esChoqueDeNumero(error)) throw error;
      ultimo = error;
      await pausarAleatoria(deps);
    }
  }
  throw errorSinNumero(ultimo);
}

/** Crea el ítem con el siguiente número libre; si otro lo tomó antes, relee el máximo y reintenta. */
async function crearConNumero(
  servicio: Servicio,
  deps: PushServicioDeps
): Promise<RemotoAsegurado> {
  let ultimo: unknown;
  for (let intento = 1; intento <= MAX_INTENTOS_NUMERO; intento += 1) {
    const numero = siguienteNumero(await deps.remoto.ultimoNumeroSolicitud());
    const candidato = conNumero(servicio, numero);
    let remoto: ServicioRemotoPush;
    try {
      remoto = await deps.remoto.crearServicio(deps.mapeador.aCamposSP(candidato));
    } catch (error) {
      if (!esChoqueDeNumero(error)) throw error;
      ultimo = error;
      deps.alReintentarNumero?.({ motivo: 'choque', intento, numero });
      if (intento < MAX_INTENTOS_NUMERO) await pausarAleatoria(deps);
      continue;
    }

    // Si el POST recuperó un ítem que ya existía (reintento idempotente), se queda con el número de ese ítem.
    const delItem = Number(remoto.fields.NumeroSolicitud);
    if (Number.isFinite(delItem) && delItem > 0 && delItem !== numero) {
      return { remoto, servicio: conNumero(servicio, delItem), numeroSolicitud: delItem };
    }

    const verificado = await verificarNumeroUnico(remoto, candidato, deps);
    return {
      remoto: verificado.remoto,
      servicio: verificado.servicio,
      numeroSolicitud: verificado.servicio.numeroSolicitud,
    };
  }
  throw errorSinNumero(ultimo);
}

async function asegurarRemoto(
  servicio: Servicio,
  deps: PushServicioDeps
): Promise<RemotoAsegurado> {
  if (servicio.sp?.itemId) {
    return {
      servicio,
      remoto: {
        id: servicio.sp.itemId,
        fields: {},
        ...(servicio.sp.eTag ? { eTag: servicio.sp.eTag } : {}),
        ...(servicio.sp.webUrl ? { webUrl: servicio.sp.webUrl } : {}),
        ...(servicio.sp.modificadoEn ? { modificadoEn: servicio.sp.modificadoEn } : {}),
      },
    };
  }

  const existente = await deps.remoto.buscarServicioPorId(servicio.id);
  if (existente) {
    const delItem = Number(existente.fields.NumeroSolicitud);
    if (esPendiente(servicio.numeroSolicitud) && Number.isFinite(delItem) && delItem > 0) {
      return {
        remoto: existente,
        servicio: conNumero(servicio, delItem),
        numeroSolicitud: delItem,
      };
    }
    return { remoto: existente, servicio };
  }

  if (esPendiente(servicio.numeroSolicitud)) return crearConNumero(servicio, deps);

  // Si el POST choca con el valor único ServicioId, el gateway recupera el
  // ítem existente; por eso después se aplican igual los campos sucios.
  return {
    servicio,
    remoto: await deps.remoto.crearServicio(deps.mapeador.aCamposSP(servicio)),
  };
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
  servicioEntrada: Servicio,
  adjuntosEntrada: readonly Adjunto[],
  deps: PushServicioDeps
): Promise<ResultadoPushServicio> {
  const asegurado = await asegurarRemoto(servicioEntrada, deps);
  const { remoto, servicio } = asegurado;
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

  return {
    sp,
    camposEnviados,
    baseRemota,
    archivosSubidos,
    adjuntos,
    ...(asegurado.numeroSolicitud === undefined
      ? {}
      : { numeroSolicitud: asegurado.numeroSolicitud }),
  };
}
