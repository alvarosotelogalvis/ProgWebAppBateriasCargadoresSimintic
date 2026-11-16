import type { Adjunto } from '@/domain/adjunto';
import {
  AdjuntoDuplicadoError,
  AlmacenamientoLlenoError,
  LimiteAdjuntosError,
  NoEncontradoError,
} from '@/domain/errores';
import { normalizarCodigoAlfanumerico } from '@/domain/normalizacion';
import type { Servicio, TipoAdjunto } from '@/domain/servicio';
import { crearAgregarPdf } from './agregarPdf';
import type { DepsAdjuntos } from './deps';

const limiteMaximo = (tipo: TipoAdjunto, config: ReturnType<DepsAdjuntos['config']>): number =>
  tipo === 'FOTO_INGRESO' ? config.maxFotosIngreso : config.maxFotosSalida;

const validarAlmacenamiento = async (deps: DepsAdjuntos): Promise<void> => {
  const estimacion = await deps.storage.estimar();
  if (estimacion.porcentajeUsado >= 95) {
    throw new AlmacenamientoLlenoError();
  }
};

const construirNombre = (servicio: Servicio, adjuntoId: string): string =>
  `${normalizarCodigoAlfanumerico(servicio.codigo || servicio.id)}_${adjuntoId}.jpg`;

export const crearAgregarFoto =
  (deps: DepsAdjuntos) =>
  async (
    servicioId: string,
    archivo: Blob,
    tipo: TipoAdjunto = 'FOTO_INGRESO'
  ): Promise<Adjunto> => {
    const servicio = await deps.servicios.obtener(servicioId);
    if (!servicio) throw new NoEncontradoError(servicioId);

    const existentes = (await deps.adjuntos.listarPorServicio(servicioId)).filter(
      (adjunto) => adjunto.tipo === tipo
    );

    const sha256 = await deps.contenido.sha256(archivo);
    if (await deps.adjuntos.buscarPorHash(servicioId, tipo, sha256)) {
      throw new AdjuntoDuplicadoError();
    }
    if (existentes.length >= limiteMaximo(tipo, deps.config())) throw new LimiteAdjuntosError();

    await validarAlmacenamiento(deps);
    const config = deps.config();
    const procesada = await deps.imageProcessor.procesar(archivo, {
      maxLadoPx: config.imagenMaxLadoPx,
      calidad: config.imagenCalidad,
      ladoMiniaturaPx: 320,
    });

    const id = deps.ids.siguiente();
    const ahora = deps.clock.ahoraIso();
    const cuenta = deps.auth.cuentaActiva();
    const adjunto: Adjunto = {
      id,
      servicioId,
      tipo,
      nombreArchivo: construirNombre(servicio, id),
      mime: procesada.mime,
      tamanoBytes: procesada.principal.size,
      sha256,
      capturadoEn: ahora,
      capturadoPor: cuenta?.correo ?? 'local',
      blob: procesada.principal,
      miniatura: procesada.miniatura,
      syncState: servicio.estado === 'BORRADOR' ? 'local' : 'pending',
      eliminarRemoto: false,
    };

    await deps.adjuntos.guardar(adjunto);
    deps.logger.info('adjunto.agregado', {
      servicioId,
      adjuntoId: id,
      tipo,
      bytes: adjunto.tamanoBytes,
    });
    return adjunto;
  };

export const crearEliminarAdjunto =
  (deps: DepsAdjuntos) =>
  async (adjuntoId: string): Promise<void> => {
    const adjunto = await deps.adjuntos.obtener(adjuntoId);
    if (!adjunto) return;

    if (adjunto.sp || adjunto.syncState === 'synced') {
      await deps.adjuntos.guardar({
        ...adjunto,
        blob: null,
        miniatura: null,
        eliminarRemoto: true,
        syncState: 'pending',
      });
    } else {
      await deps.adjuntos.eliminarLocal(adjuntoId);
    }
    deps.logger.info('adjunto.eliminado', {
      servicioId: adjunto.servicioId,
      adjuntoId,
    });
  };

export const crearCasosDeUsoAdjuntos = (deps: DepsAdjuntos) => ({
  agregarFoto: crearAgregarFoto(deps),
  agregarPdf: crearAgregarPdf(deps),
  eliminarAdjunto: crearEliminarAdjunto(deps),
});

export type CasosDeUsoAdjuntos = ReturnType<typeof crearCasosDeUsoAdjuntos>;
