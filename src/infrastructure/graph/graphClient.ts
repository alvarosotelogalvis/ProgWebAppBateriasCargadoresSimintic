import type { AuthPort } from '@/application/ports/authPort';
import type { IdGenerator } from '@/application/ports/idGenerator';
import type { Logger } from '@/application/ports/loggerPort';
import { AppError, aAppError } from '@/shared/errors';

import { calcularEspera, esperaDesdeRetryAfter } from './backoff';
import { traducirRespuesta } from './errores';

const BASE_URL = 'https://graph.microsoft.com/v1.0';
const TIMEOUT_DEFECTO_MS = 10_000;
const REINTENTOS_DEFECTO = 4;

export interface GraphRequest {
  readonly metodo: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly ruta: string;
  readonly cuerpo?: unknown;
  readonly cabeceras?: Record<string, string>;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly correlationId?: string;
}

export interface GraphRespuesta<T> {
  readonly datos: T;
  readonly estado: number;
  readonly cabeceras: Headers;
  readonly clientRequestId: string;
}

export interface GraphClient {
  enviar<T>(req: GraphRequest): Promise<GraphRespuesta<T>>;
  paginar<T>(ruta: string, opts?: Omit<GraphRequest, 'metodo' | 'ruta'>): AsyncGenerator<T>;
}

export interface DepsGraphClient {
  readonly auth: AuthPort;
  readonly logger: Logger;
  readonly ids: IdGenerator;
  readonly fetchImpl?: typeof fetch;
  readonly reintentosPorLlamada?: number;
  readonly dormir?: (ms: number) => Promise<void>;
}

const dormirReal = (ms: number): Promise<void> =>
  new Promise((resolver) => {
    setTimeout(resolver, ms);
  });

const urlCompleta = (ruta: string): string =>
  ruta.startsWith('https://') ? ruta : `${BASE_URL}${ruta.startsWith('/') ? '' : '/'}${ruta}`;

const rutaSinQuery = (ruta: string): string => ruta.split('?')[0] ?? ruta;

const hayRed = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false;

export function crearGraphClient({
  auth,
  logger,
  ids,
  fetchImpl,
  reintentosPorLlamada = REINTENTOS_DEFECTO,
  dormir = dormirReal,
}: DepsGraphClient): GraphClient {
  const ejecutarFetch: typeof fetch = fetchImpl ?? ((...args) => fetch(...args));

  const enviar = async <T>(req: GraphRequest): Promise<GraphRespuesta<T>> => {
    const url = urlCompleta(req.ruta);
    const clientRequestId = ids.siguiente();
    let token = await auth.asegurarToken({ interactivoSiEsNecesario: false });
    let tokenRefrescado = false;
    let ultimoError: AppError | undefined;

    for (let intento = 0; intento <= reintentosPorLlamada; intento += 1) {
      if (!hayRed()) {
        throw new AppError({
          codigo: 'RED_SIN_CONEXION',
          mensaje: 'No hay conexion a internet.',
          claveI18n: 'errores.codigo.RED_SIN_CONEXION',
          reintentable: true,
        });
      }

      const controlador = new AbortController();
      const temporizador = setTimeout(
        () => controlador.abort(),
        req.timeoutMs ?? TIMEOUT_DEFECTO_MS
      );
      const abortarExterno = (): void => controlador.abort();
      req.signal?.addEventListener('abort', abortarExterno, { once: true });

      try {
        const respuesta = await ejecutarFetch(url, {
          method: req.metodo,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'client-request-id': clientRequestId,
            ...(req.cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...req.cabeceras,
          },
          ...(req.cuerpo === undefined ? {} : { body: JSON.stringify(req.cuerpo) }),
          signal: controlador.signal,
        });

        logger.info(
          'graph.request',
          {
            metodo: req.metodo,
            ruta: rutaSinQuery(url),
            estado: respuesta.status,
          },
          { clientRequestId, ...(req.correlationId ? { correlationId: req.correlationId } : {}) }
        );

        if (respuesta.ok) {
          return {
            datos: await leerCuerpo<T>(respuesta),
            estado: respuesta.status,
            cabeceras: respuesta.headers,
            clientRequestId,
          };
        }

        if (respuesta.status === 401 && !tokenRefrescado) {
          tokenRefrescado = true;
          token = await auth.asegurarToken({
            interactivoSiEsNecesario: false,
            forzarLogin: true,
          });
          intento -= 1;
          continue;
        }

        const cuerpo = await leerCuerpo<unknown>(respuesta).catch(() => undefined);
        const error = traducirRespuesta(respuesta.status, cuerpo);
        ultimoError = error;
        if (!error.reintentable || intento === reintentosPorLlamada) throw error;

        const retryAfter = esperaDesdeRetryAfter(respuesta.headers.get('retry-after'));
        await dormir(calcularEspera(intento + 1, retryAfter));
      } catch (causa) {
        if (causa instanceof AppError) {
          if (!causa.reintentable || intento === reintentosPorLlamada) throw causa;
          ultimoError = causa;
          await dormir(calcularEspera(intento + 1));
          continue;
        }

        const error = traducirErrorRed(causa);
        ultimoError = error;
        if (!error.reintentable || intento === reintentosPorLlamada) throw error;
        await dormir(calcularEspera(intento + 1));
      } finally {
        clearTimeout(temporizador);
        req.signal?.removeEventListener('abort', abortarExterno);
      }
    }

    throw (
      ultimoError ??
      new AppError({
        codigo: 'DESCONOCIDO',
        mensaje: 'No se pudo completar la solicitud.',
        claveI18n: 'errores.codigo.DESCONOCIDO',
      })
    );
  };

  async function* paginar<T>(
    ruta: string,
    opts: Omit<GraphRequest, 'metodo' | 'ruta'> = {}
  ): AsyncGenerator<T> {
    let siguiente: string | undefined = ruta;
    while (siguiente) {
      const respuesta: GraphRespuesta<{ value?: T[]; '@odata.nextLink'?: string }> =
        await enviar<{ value?: T[]; '@odata.nextLink'?: string }>({
        ...opts,
        metodo: 'GET',
        ruta: siguiente,
      });
      for (const item of respuesta.datos.value ?? []) yield item;
      siguiente = respuesta.datos['@odata.nextLink'];
    }
  }

  return { enviar, paginar };
}

async function leerCuerpo<T>(respuesta: Response): Promise<T> {
  if (respuesta.status === 204) return undefined as T;
  const tipo = respuesta.headers.get('content-type') ?? '';
  if (!tipo.includes('json')) {
    const texto = await respuesta.text();
    return (texto === '' ? undefined : texto) as T;
  }
  return (await respuesta.json()) as T;
}

function traducirErrorRed(causa: unknown): AppError {
  if (causa instanceof AppError) return causa;
  const nombre =
    typeof causa === 'object' && causa !== null && 'name' in causa
      ? String((causa as { name?: unknown }).name ?? '')
      : '';
  if (nombre === 'AbortError') {
    return new AppError({
      codigo: 'SP_SERVIDOR',
      mensaje: 'La solicitud tardo demasiado.',
      claveI18n: 'errores.codigo.SP_SERVIDOR',
      reintentable: true,
      causa,
    });
  }
  if (causa instanceof TypeError) {
    return new AppError({
      codigo: 'RED_SIN_CONEXION',
      mensaje: 'No hay conexion a internet.',
      claveI18n: 'errores.codigo.RED_SIN_CONEXION',
      reintentable: true,
      causa,
    });
  }
  return aAppError(causa);
}
