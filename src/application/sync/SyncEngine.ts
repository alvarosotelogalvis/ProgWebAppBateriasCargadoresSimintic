import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { Clock } from '@/application/ports/clock';
import type { Logger } from '@/application/ports/loggerPort';
import type { MapeadorServicio } from '@/application/ports/mapeadorServicio';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { RemoteGatewayPush, EntradaLogSync } from '@/application/ports/RemoteGatewayPush';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { LockSync } from '@/application/ports/syncLock';
import type { Uploader } from '@/application/ports/UploaderPort';
import { CLAVES_META } from '@/application/setup/claves';
import type { ConfigApp } from '@/domain/config';
import type { CamposServicio, Servicio } from '@/domain/servicio';
import {
  MAX_INTENTOS_AUTOMATICOS,
  puedeReintentarAutomaticamente,
  proximoIntento,
} from '@/domain/sync/backoff';
import { resumirErroresLog, type ErrorBitacora } from '@/domain/sync/bitacora';
import { clasificarError, type ClaseError } from '@/domain/sync/errores';
import { esVersionMinimaSuficiente } from '@/domain/sync/version';
import { AppError } from '@/shared/errors';

import { ConflictoError } from './ConflictoError';
import { EventBusSync, type EventoSync, type ResumenSync } from './eventosSync';
import { pushServicio, type ResultadoPushServicio } from './pushServicio';
import { crearResolutorPorDefecto, type ResolutorConflictos } from './resolutorConflictos';

export interface ContextoFinSync {
  readonly correlationId: string;
  readonly resumen: ResumenSync;
  readonly signal: AbortSignal;
}

export interface DepsSyncEngine {
  readonly servicios: ServicioRepository;
  readonly adjuntos: AdjuntoRepository;
  readonly remoto: RemoteGatewayPush;
  readonly uploader: Uploader;
  readonly mapeador: MapeadorServicio;
  readonly meta: MetaRepository;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly config: () => ConfigApp;
  readonly appVersion: string;
  readonly lock: LockSync;
  /** Relee `ConfiguracionApp` antes de comprobar la versión mínima (SDD §9.2). Best-effort. */
  readonly refrescarConfig?: () => Promise<void>;
  readonly resolutorConflictos?: ResolutorConflictos;
  readonly bus?: EventBusSync;
  readonly usuario?: () => string | undefined;
  readonly despuesDelPush?: (contexto: ContextoFinSync) => Promise<void> | void;
  readonly alFinalizar?: (contexto: ContextoFinSync) => Promise<void> | void;
}

export interface OpcionesSincronizar {
  readonly correlationId: string;
  readonly signal: AbortSignal;
}

export interface SyncEngine {
  sincronizar(opciones: OpcionesSincronizar): Promise<ResumenSync>;
  on(evento: EventoSync['tipo'], cb: (evento: EventoSync) => void): () => void;
}

const MENSAJE_ERROR_MAX = 300;

const hayRed = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false;

const mismosValores = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!estaDefinido(a) && !estaDefinido(b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
};

const estaDefinido = (valor: unknown): boolean => valor !== undefined && valor !== null;

/** Quita las propiedades opcionales de seguimiento respetando `exactOptionalPropertyTypes`. */
function sinSeguimiento(servicio: Servicio): Servicio {
  const copia: Servicio = { ...servicio };
  delete copia.proximoIntentoEn;
  delete copia.ultimoError;
  return copia;
}

const mensajeDe = (error: unknown): string => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message.slice(0, MENSAJE_ERROR_MAX);
  }
  return 'Error de sincronización';
};

const codigoDe = (error: unknown): string =>
  error instanceof AppError
    ? error.codigo
    : error instanceof ConflictoError
      ? 'CONFLICTO'
      : 'DESCONOCIDO';

function clasificar(error: unknown): ClaseError {
  if (error instanceof ConflictoError) return 'CONFLICTO';

  if (error instanceof AppError) {
    const detalles = error.detalles ?? {};
    return clasificarError({
      ...(error.estadoHttp === undefined ? {} : { status: error.estadoHttp }),
      esRed: error.codigo === 'RED_SIN_CONEXION' || error.codigo === 'SIN_CONEXION' || !hayRed(),
      esTimeout: detalles.timeout === true,
      esSesionSubida: detalles.sesionSubida === true,
    });
  }

  if (!hayRed()) return 'RED';
  if (error instanceof TypeError) return 'RED';
  return clasificarError({});
}

function plataforma(): string {
  if (typeof navigator === 'undefined') return 'desconocida';
  const datos = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return datos?.platform ?? navigator.platform ?? 'desconocida';
}

/**
 * Orquestador del push (SDD §9.2). Procesa los servicios en serie y los archivos
 * de cada servicio con concurrencia 2; cada paso se guarda antes de continuar.
 */
export class MotorSync implements SyncEngine {
  private readonly bus: EventBusSync;
  private readonly resolutor: ResolutorConflictos;

  constructor(private readonly deps: DepsSyncEngine) {
    this.bus = deps.bus ?? new EventBusSync();
    this.resolutor = deps.resolutorConflictos ?? crearResolutorPorDefecto();
  }

  on(evento: EventoSync['tipo'], cb: (evento: EventoSync) => void): () => void {
    return this.bus.on((suceso) => {
      if (suceso.tipo === evento) cb(suceso);
    });
  }

  async sincronizar({ correlationId, signal }: OpcionesSincronizar): Promise<ResumenSync> {
    await this.verificarPrecondiciones();

    const bloqueo = await this.deps.lock('sync', async () => this.ejecutar(correlationId, signal), {
      ifAvailable: true,
    });

    if (!bloqueo.adquirido) {
      this.bus.emitir({ tipo: 'ocupado' });
      const resumen: ResumenSync = {
        subidos: 0,
        archivos: 0,
        errores: 0,
        conflictos: 0,
        resultado: 'Error',
        ocupado: true,
      };
      this.bus.emitir({ tipo: 'fin', resumen });
      return resumen;
    }
    return bloqueo.valor;
  }

  private async verificarPrecondiciones(): Promise<void> {
    if (!hayRed()) {
      throw new AppError({
        codigo: 'SIN_CONEXION',
        mensaje: 'Sin conexión a Internet.',
        claveI18n: 'errores.codigo.SIN_CONEXION',
        reintentable: true,
      });
    }

    const completa =
      (await this.deps.meta.obtener<boolean>(CLAVES_META.configuracionInicialCompleta)) === true;
    if (!completa) {
      throw new AppError({
        codigo: 'CONFIG_INVALIDA',
        mensaje: 'La configuración inicial no está completa.',
        claveI18n: 'errores.codigo.CONFIG_INVALIDA',
        reintentable: false,
      });
    }

    if (this.deps.refrescarConfig) {
      try {
        await this.deps.refrescarConfig();
      } catch (error) {
        // Si no se puede leer la configuración remota se sigue con la copia en caché.
        this.deps.logger.warn('sync.config.refresco.fallo', { mensaje: mensajeDe(error) });
      }
    }

    const config = this.deps.config();
    if (!esVersionMinimaSuficiente(this.deps.appVersion, config.versionMinimaApp)) {
      throw new AppError({
        codigo: 'VERSION_OBSOLETA',
        mensaje: 'Actualiza la app para sincronizar.',
        claveI18n: 'errores.codigo.VERSION_OBSOLETA',
        reintentable: false,
        detalles: { minima: config.versionMinimaApp, actual: this.deps.appVersion },
      });
    }
  }

  private async ejecutar(correlationId: string, signal: AbortSignal): Promise<ResumenSync> {
    const ahora = this.deps.clock.ahoraIso();
    const inicio = ahora;
    const pendientes = await this.listarParaProcesar(ahora);

    this.bus.emitir({ tipo: 'inicio', correlationId, total: pendientes.length });

    const acumulado = { subidos: 0, archivos: 0, errores: 0, conflictos: 0 };
    const erroresResumen: ErrorBitacora[] = [];
    let abortado = false;

    for (const referencia of pendientes) {
      if (signal.aborted) {
        abortado = true;
        break;
      }

      const actual = await this.deps.servicios.obtener(referencia.id);
      if (!actual) continue;

      const enCurso: Servicio = { ...actual, syncState: 'syncing' };
      await this.deps.servicios.guardar(enCurso);
      this.bus.emitir({ tipo: 'servicio:inicio', servicioId: enCurso.id, codigo: enCurso.codigo });

      try {
        const adjuntos = await this.deps.adjuntos.listarPorServicio(enCurso.id);
        const resultado = await pushServicio(enCurso, adjuntos, {
          remoto: this.deps.remoto,
          uploader: this.deps.uploader,
          mapeador: this.deps.mapeador,
          ahoraIso: () => this.deps.clock.ahoraIso(),
          signal,
          onProgreso: (adjunto, enviados, totales) => {
            this.bus.emitir({
              tipo: 'archivo:progreso',
              servicioId: enCurso.id,
              adjuntoId: adjunto.id,
              nombreArchivo: adjunto.nombreArchivo,
              bytesEnviados: enviados,
              bytesTotales: totales,
            });
          },
          onAdjuntoGuardar: (adjunto) => this.deps.adjuntos.guardar(adjunto),
          onAdjuntoEliminar: (adjuntoId) => this.deps.adjuntos.eliminarLocal(adjuntoId),
        });

        const guardado = await this.fusionarConLaBase(enCurso, resultado);
        await this.deps.servicios.guardar(guardado);

        acumulado.subidos += 1;
        acumulado.archivos += resultado.archivosSubidos;
        this.bus.emitir({
          tipo: 'servicio:ok',
          servicioId: guardado.id,
          archivosSubidos: resultado.archivosSubidos,
        });
      } catch (error) {
        if (signal.aborted) {
          await this.revertirAPendiente(enCurso.id);
          abortado = true;
          break;
        }

        const clase = clasificar(error);

        if (error instanceof ConflictoError) {
          await this.entregarAConflicto(enCurso, error);
          acumulado.conflictos += 1;
          this.bus.emitir({
            tipo: 'conflicto',
            servicioId: enCurso.id,
            campos: error.campos,
          });
          continue;
        }

        this.bus.emitir({
          tipo: 'servicio:error',
          servicioId: enCurso.id,
          clase,
          mensaje: mensajeDe(error),
          error,
        });

        if (clase === 'RED' || clase === 'AUTH' || clase === 'CONFIGURACION') {
          await this.revertirAPendiente(enCurso.id);
          abortado = true;
          if (clase === 'CONFIGURACION') {
            acumulado.errores += 1;
            erroresResumen.push({
              servicioId: enCurso.id,
              codigo: codigoDe(error),
              mensaje: mensajeDe(error),
            });
          }
          break;
        }

        if (
          clase === 'REINTENTABLE' ||
          clase === 'SESION_SUBIDA_EXPIRADA' ||
          clase === 'IDEMPOTENCIA'
        ) {
          await this.registrarReintento(enCurso, error);
        } else {
          await this.registrarErrorManual(enCurso, error);
        }

        acumulado.errores += 1;
        erroresResumen.push({
          servicioId: enCurso.id,
          codigo: codigoDe(error),
          mensaje: mensajeDe(error),
        });
      }
    }

    const resumen = this.resumir(acumulado, abortado);
    await this.actualizarMeta(correlationId);
    await this.ejecutarExtension(this.deps.despuesDelPush, { correlationId, resumen, signal });
    await this.registrarLog(correlationId, inicio, resumen, erroresResumen);
    await this.ejecutarExtension(this.deps.alFinalizar, { correlationId, resumen, signal });

    this.bus.emitir({ tipo: 'fin', resumen });
    this.deps.logger.info('sync.fin', {
      correlationId,
      subidos: resumen.subidos,
      archivos: resumen.archivos,
      errores: resumen.errores,
      conflictos: resumen.conflictos,
      resultado: resumen.resultado,
    });
    return resumen;
  }

  private async listarParaProcesar(ahora: string): Promise<Servicio[]> {
    const pendientes = await this.deps.servicios.listarPendientes();
    const limite = Date.parse(ahora);

    return pendientes
      .filter((servicio) => servicio.estado !== 'BORRADOR')
      .filter((servicio) => servicio.syncState !== 'conflict')
      .filter((servicio) => {
        if (!servicio.proximoIntentoEn) return true;
        const proximo = Date.parse(servicio.proximoIntentoEn);
        return !Number.isFinite(proximo) || proximo <= limite;
      })
      .sort((a, b) => a.actualizadoEn.localeCompare(b.actualizadoEn));
  }

  private async fusionarConLaBase(
    enCurso: Servicio,
    resultado: ResultadoPushServicio
  ): Promise<Servicio> {
    const actual = (await this.deps.servicios.obtener(enCurso.id)) ?? enCurso;
    const sucios = new Set<keyof CamposServicio>(actual.camposSucios);
    const base: Partial<CamposServicio> = { ...actual.base, ...resultado.baseRemota };

    for (const [campo, enviado] of resultado.camposEnviados) {
      if (mismosValores(actual[campo], enviado)) {
        sucios.delete(campo);
        (base as Record<string, unknown>)[campo] = enviado;
      } else {
        // Se editó durante la subida: queda pendiente para la próxima ejecución.
        sucios.add(campo);
      }
    }

    return {
      ...sinSeguimiento(actual),
      sp: resultado.sp,
      base,
      camposSucios: [...sucios],
      syncState: sucios.size > 0 ? 'pending' : 'synced',
      intentos: 0,
    };
  }

  private async entregarAConflicto(servicio: Servicio, error: ConflictoError): Promise<void> {
    const actual = (await this.deps.servicios.obtener(servicio.id)) ?? servicio;
    const resolucion = await this.resolutor.resolver({ servicio: actual, error });
    const guardado: Servicio = {
      ...sinSeguimiento(resolucion.servicio),
      syncState:
        resolucion.estado === 'conflict'
          ? 'conflict'
          : resolucion.servicio.camposSucios.length > 0
            ? 'pending'
            : 'synced',
      intentos: 0,
    };
    await this.deps.servicios.guardar(guardado);
    this.deps.logger.warn('sync.conflicto', {
      servicioId: servicio.id,
      campos: error.campos,
    });
  }

  private async registrarReintento(servicio: Servicio, error: unknown): Promise<void> {
    const actual = (await this.deps.servicios.obtener(servicio.id)) ?? servicio;
    const intentos = actual.intentos + 1;
    const automatico =
      puedeReintentarAutomaticamente(intentos) && intentos < MAX_INTENTOS_AUTOMATICOS;
    const guardado: Servicio = {
      ...actual,
      syncState: 'error',
      intentos,
      ultimoError: {
        codigo: codigoDe(error),
        mensaje: mensajeDe(error),
        en: this.deps.clock.ahoraIso(),
      },
    };

    if (automatico) {
      guardado.proximoIntentoEn = proximoIntento(
        intentos,
        new Date(this.deps.clock.ahoraIso())
      ).toISOString();
    } else {
      delete guardado.proximoIntentoEn;
    }

    await this.deps.servicios.guardar(guardado);
  }

  private async registrarErrorManual(servicio: Servicio, error: unknown): Promise<void> {
    const actual = (await this.deps.servicios.obtener(servicio.id)) ?? servicio;
    const guardado: Servicio = {
      ...actual,
      syncState: 'error',
      ultimoError: {
        codigo: codigoDe(error),
        mensaje: mensajeDe(error),
        en: this.deps.clock.ahoraIso(),
      },
    };
    delete guardado.proximoIntentoEn;
    await this.deps.servicios.guardar(guardado);
  }

  private async revertirAPendiente(servicioId: string): Promise<void> {
    const actual = await this.deps.servicios.obtener(servicioId);
    if (!actual) return;
    await this.deps.servicios.guardar({ ...actual, syncState: 'pending' });
  }

  private resumir(
    acumulado: { subidos: number; archivos: number; errores: number; conflictos: number },
    abortado: boolean
  ): ResumenSync {
    const conProblemas = acumulado.errores + acumulado.conflictos > 0;
    const resultado =
      !conProblemas && !abortado
        ? 'OK'
        : acumulado.subidos > 0 || acumulado.archivos > 0
          ? 'Parcial'
          : 'Error';
    return { ...acumulado, resultado };
  }

  private async actualizarMeta(correlationId: string): Promise<void> {
    await this.deps.meta.guardar(CLAVES_META.ultimaSyncEn, this.deps.clock.ahoraIso());
    await this.deps.meta.guardar(CLAVES_META.ultimoCorrelationId, correlationId);
  }

  private async registrarLog(
    correlationId: string,
    inicio: string,
    resumen: ResumenSync,
    errores: readonly ErrorBitacora[]
  ): Promise<void> {
    const registrar = this.deps.remoto.registrarLogSync;
    if (!registrar) return;

    let dispositivo = 'desconocido';
    try {
      dispositivo = `${await this.deps.meta.dispositivoId()}/${plataforma()}`;
    } catch {
      dispositivo = plataforma();
    }

    const entrada: EntradaLogSync = {
      correlationId,
      usuario: this.deps.usuario?.() ?? '',
      dispositivo,
      appVersion: this.deps.appVersion,
      inicio,
      fin: this.deps.clock.ahoraIso(),
      resultado: resumen.resultado,
      serviciosSubidos: resumen.subidos,
      archivosSubidos: resumen.archivos,
      serviciosDescargados: 0,
      conflictos: resumen.conflictos,
      errores: resumirErroresLog(errores),
    };

    try {
      await registrar.call(this.deps.remoto, entrada);
    } catch (error) {
      // La bitácora es best-effort: su fallo nunca cambia el resultado (ES-005-25).
      this.deps.logger.warn('sync.log.fallo', {
        correlationId,
        mensaje: mensajeDe(error),
      });
    }
  }

  private async ejecutarExtension(
    extension: ((contexto: ContextoFinSync) => Promise<void> | void) | undefined,
    contexto: ContextoFinSync
  ): Promise<void> {
    if (!extension) return;
    try {
      await extension(contexto);
    } catch (error) {
      this.deps.logger.warn('sync.extension.fallo', {
        correlationId: contexto.correlationId,
        mensaje: mensajeDe(error),
      });
    }
  }
}
