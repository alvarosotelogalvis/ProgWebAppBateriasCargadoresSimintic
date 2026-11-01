import type { AuthPort } from '@/application/ports/authPort';
import type { ItemSubido, OpcionesSubida, Uploader } from '@/application/ports/UploaderPort';
import type { SesionSubida } from '@/domain/adjunto';
import { AppError } from '@/shared/errors';

import type { GraphClient } from './graphClient';

export const TAMANO_SIMPLE_MAX = 4 * 1024 * 1024;
/** 3 200 KiB = 10 × 320 KiB, el múltiplo recomendado por Graph (SDD §7.3). */
export const TAMANO_FRAGMENTO = 3_200 * 1024;

const BASE_URL = 'https://graph.microsoft.com/v1.0';

export interface DepsGraphUploader {
  readonly graph: GraphClient;
  readonly auth: AuthPort;
  readonly driveId: string;
  readonly fetchImpl?: typeof fetch;
  readonly ahora?: () => Date;
}

const codificarRuta = (ruta: string): string =>
  ruta
    .split('/')
    .filter((parte) => parte.length > 0)
    .map((parte) => encodeURIComponent(parte))
    .join('/');

const normalizarItem = (cuerpo: unknown): ItemSubido => {
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    throw new AppError({
      codigo: 'SP_SERVIDOR',
      mensaje: 'SharePoint no devolvió los datos del archivo subido.',
      reintentable: true,
    });
  }
  const item = cuerpo as Record<string, unknown>;
  const id = item.id;
  if (typeof id !== 'string' || id.length === 0) {
    throw new AppError({
      codigo: 'SP_SERVIDOR',
      mensaje: 'SharePoint no devolvió el identificador del archivo subido.',
      reintentable: true,
    });
  }
  const eTag = item.eTag ?? item['@odata.etag'];
  const webUrl = item.webUrl;
  const nombre = item.name;
  return {
    id,
    ...(typeof eTag === 'string' ? { eTag } : {}),
    ...(typeof webUrl === 'string' ? { webUrl } : {}),
    ...(typeof nombre === 'string' ? { nombre } : {}),
  };
};

const errorDeEstado = (estado: number, esSesion: boolean): AppError => {
  if (estado === 404 && esSesion) {
    return new AppError({
      codigo: 'SP_NO_ENCONTRADO',
      mensaje: 'La sesión de subida expiró; se reanudará desde el inicio.',
      claveI18n: 'errores.codigo.SP_NO_ENCONTRADO',
      reintentable: true,
      estadoHttp: 404,
      detalles: { sesionSubida: true },
    });
  }
  if (estado === 413) {
    return new AppError({
      codigo: 'SP_LIMITE',
      mensaje: 'El archivo supera el tamaño máximo permitido.',
      claveI18n: 'errores.codigo.SP_LIMITE',
      reintentable: false,
      estadoHttp: estado,
    });
  }
  if (estado === 401 || estado === 403) {
    return new AppError({
      codigo: estado === 401 ? 'AUTH_REQUERIDA' : 'SP_SIN_PERMISO',
      mensaje: estado === 401 ? 'Sesión expirada.' : 'Sin permisos para subir archivos.',
      reintentable: false,
      estadoHttp: estado,
    });
  }
  const reintentable = estado === 429 || estado >= 500;
  return new AppError({
    codigo: reintentable ? 'SP_SERVIDOR' : 'SP_CONFLICTO',
    mensaje: reintentable
      ? 'SharePoint no pudo completar la subida; se reintentará.'
      : 'SharePoint rechazó la subida del archivo.',
    reintentable,
    estadoHttp: estado,
  });
};

const sesionVigente = (sesion: SesionSubida, ahora: Date): boolean => {
  const expira = Date.parse(sesion.expira);
  return Number.isFinite(expira) && expira > ahora.getTime();
};

const esSesionExpirada = (error: unknown): boolean =>
  error instanceof AppError && error.detalles?.sesionSubida === true;

export function crearGraphUploader({
  graph,
  auth,
  driveId,
  fetchImpl,
  ahora = () => new Date(),
}: DepsGraphUploader): Uploader {
  const ejecutarFetch: typeof fetch = fetchImpl ?? ((...args) => fetch(...args));

  const crearSesion = async (ruta: string): Promise<SesionSubida> => {
    const respuesta = await graph.enviar<{ uploadUrl?: string; expirationDateTime?: string }>({
      metodo: 'POST',
      ruta: `/drives/${driveId}/root:/${codificarRuta(ruta)}:/createUploadSession`,
      cuerpo: { item: { '@microsoft.graph.conflictBehavior': 'replace' } },
      timeoutMs: 10_000,
    });
    const { uploadUrl, expirationDateTime } = respuesta.datos;
    if (typeof uploadUrl !== 'string' || uploadUrl.length === 0) {
      throw new AppError({
        codigo: 'SP_SERVIDOR',
        mensaje: 'SharePoint no devolvió la URL de la sesión de subida.',
        reintentable: true,
      });
    }
    return {
      url: uploadUrl.startsWith('http') ? uploadUrl : `${BASE_URL}${uploadUrl}`,
      expira: expirationDateTime ?? new Date(ahora().getTime() + 60 * 60 * 1000).toISOString(),
      siguienteByte: 0,
    };
  };

  const subidaSimple = async (
    token: string,
    archivo: Blob,
    ruta: string,
    opciones: OpcionesSubida
  ): Promise<ItemSubido> => {
    const url = `${BASE_URL}/drives/${driveId}/root:/${codificarRuta(
      ruta
    )}:/content?@microsoft.graph.conflictBehavior=replace`;
    const respuesta = await ejecutarFetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': archivo.type || 'application/octet-stream',
      },
      body: archivo,
      ...(opciones.signal ? { signal: opciones.signal } : {}),
    });
    if (!respuesta.ok) throw errorDeEstado(respuesta.status, false);
    opciones.onProgreso?.(archivo.size, archivo.size);
    return normalizarItem(await leerJson(respuesta));
  };

  const subirFragmentos = async (
    archivo: Blob,
    sesion: SesionSubida,
    opciones: OpcionesSubida
  ): Promise<ItemSubido> => {
    let enviados = Math.min(Math.max(0, sesion.siguienteByte), archivo.size);
    while (enviados < archivo.size) {
      if (opciones.signal?.aborted) {
        throw new DOMException('Subida cancelada', 'AbortError');
      }

      const fin = Math.min(enviados + TAMANO_FRAGMENTO, archivo.size);
      const fragmento = archivo.slice(enviados, fin);
      const respuesta = await ejecutarFetch(sesion.url, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${enviados}-${fin - 1}/${archivo.size}`,
          'Content-Length': String(fragmento.size),
        },
        body: fragmento,
        ...(opciones.signal ? { signal: opciones.signal } : {}),
      });

      if (respuesta.status === 404) {
        await opciones.onSesion?.(null);
        throw errorDeEstado(404, true);
      }
      if (!respuesta.ok) throw errorDeEstado(respuesta.status, true);

      enviados = fin;
      opciones.onProgreso?.(enviados, archivo.size);

      if (respuesta.status === 200 || respuesta.status === 201) {
        await opciones.onSesion?.(null);
        return normalizarItem(await leerJson(respuesta));
      }

      await opciones.onSesion?.({
        url: sesion.url,
        expira: sesion.expira,
        siguienteByte: enviados,
      });
    }

    throw new AppError({
      codigo: 'SP_SERVIDOR',
      mensaje: 'La sesión de subida terminó sin confirmar el archivo.',
      reintentable: true,
    });
  };

  const subidaPorSesion = async (
    archivo: Blob,
    ruta: string,
    opciones: OpcionesSubida
  ): Promise<ItemSubido> => {
    let sesion: SesionSubida | undefined =
      opciones.sesion && sesionVigente(opciones.sesion, ahora()) ? opciones.sesion : undefined;
    let reiniciada = false;

    for (;;) {
      if (!sesion) {
        sesion = await crearSesion(ruta);
        await opciones.onSesion?.(sesion);
      }

      try {
        return await subirFragmentos(archivo, sesion, opciones);
      } catch (error) {
        if (reiniciada || !esSesionExpirada(error)) throw error;
        // La uploadUrl expiró: se descarta la sesión y se reinicia desde cero una vez.
        reiniciada = true;
        sesion = undefined;
      }
    }
  };

  return {
    async subir(archivo, ruta, opciones = {}) {
      const token = await auth.asegurarToken({ interactivoSiEsNecesario: false });
      if (archivo.size <= TAMANO_SIMPLE_MAX) {
        return subidaSimple(token, archivo, ruta, opciones);
      }
      return subidaPorSesion(archivo, ruta, opciones);
    },
  };
}

async function leerJson(respuesta: Response): Promise<unknown> {
  const texto = await respuesta.text();
  if (texto.trim() === '') return {};
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    throw new AppError({
      codigo: 'SP_SERVIDOR',
      mensaje: 'SharePoint devolvió una respuesta ilegible.',
      reintentable: true,
    });
  }
}
