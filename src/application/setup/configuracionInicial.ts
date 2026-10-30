import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { StoragePort } from '@/application/ports/storagePort';
import type { ConfigApp } from '@/domain/config';
import { CONFIG_DEFECTO, combinarConfig } from '@/domain/config';
import { aAppError, type AppError } from '@/shared/errors';

import { CLAVES_CATALOGO, CLAVES_META, claveChoice, COLUMNAS_CHOICE } from './claves';

export type TareaSetup = 'sitio' | 'catalogos' | 'configuracion' | 'almacenamiento';

export type EstadoTareaSetup = 'pendiente' | 'en-curso' | 'ok' | 'advertencia' | 'error';

export interface EstadoTarea {
  readonly tarea: TareaSetup;
  readonly estado: EstadoTareaSetup;
  readonly error?: AppError;
  readonly detalle?: string;
}

export interface ResultadoPreparacion {
  readonly completa: boolean;
  readonly estados: readonly EstadoTarea[];
  readonly disponibleBytes?: number;
}

export interface DepsSetup {
  readonly gateway: RemoteGateway;
  readonly meta: MetaRepository;
  readonly catalogos: CatalogoRepository;
  readonly storage: StoragePort;
  readonly logger: Logger;
  readonly configDefecto?: ConfigApp;
}

const TAREAS: readonly TareaSetup[] = ['sitio', 'catalogos', 'configuracion', 'almacenamiento'];

const formatearBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

export async function ejecutarTarea(tarea: TareaSetup, deps: DepsSetup): Promise<EstadoTarea> {
  try {
    if (tarea === 'sitio') {
      const sitio = await deps.gateway.resolverSitio();
      return { tarea, estado: 'ok', detalle: sitio.webUrl };
    }

    if (tarea === 'catalogos') {
      const catalogos = await deps.gateway.leerCatalogos();
      await deps.catalogos.guardar(CLAVES_CATALOGO.clientes, catalogos.clientes);
      await deps.catalogos.guardar(CLAVES_CATALOGO.marcas, catalogos.marcas);
      for (const columna of COLUMNAS_CHOICE) {
        await deps.catalogos.guardar(claveChoice(columna), catalogos.choices[columna]);
      }
      if (catalogos.clientes.length === 0) {
        return {
          tarea,
          estado: 'advertencia',
          detalle: 'No hay clientes activos; pide al administrador que los cree.',
        };
      }
      return { tarea, estado: 'ok', detalle: `${catalogos.clientes.length} clientes` };
    }

    if (tarea === 'configuracion') {
      const remota = await deps.gateway.leerConfiguracion();
      const config = combinarConfig(remota, deps.configDefecto ?? CONFIG_DEFECTO, deps.logger);
      await deps.catalogos.guardar(CLAVES_CATALOGO.config, config);
      return { tarea, estado: 'ok' };
    }

    const persistente = await deps.storage.persistir();
    const estimacion = await deps.storage.estimar();
    await deps.meta.guardar(CLAVES_META.almacenamientoPersistente, persistente);
    return {
      tarea,
      estado: persistente ? 'ok' : 'advertencia',
      detalle: `Almacenamiento persistente: ${persistente ? 'Si' : 'No'}. Espacio disponible: ${formatearBytes(
        estimacion.disponibleBytes
      )}.`,
    };
  } catch (causa) {
    const error = aAppError(causa);
    deps.logger.error('setup.tarea.error', { tarea, codigo: error.codigo });
    return { tarea, estado: 'error', error };
  }
}

export async function ejecutarPreparacion(
  deps: DepsSetup,
  onEstado: (estado: EstadoTarea) => void = () => undefined
): Promise<ResultadoPreparacion> {
  const estados: EstadoTarea[] = [];
  let bloqueada = false;
  let disponibleBytes: number | undefined;

  for (const tarea of TAREAS) {
    if (bloqueada) {
      const pendiente: EstadoTarea = { tarea, estado: 'pendiente' };
      estados.push(pendiente);
      onEstado(pendiente);
      continue;
    }

    const enCurso: EstadoTarea = { tarea, estado: 'en-curso' };
    onEstado(enCurso);
    const resultado = await ejecutarTarea(tarea, deps);
    estados.push(resultado);
    onEstado(resultado);

    if (tarea === 'almacenamiento') {
      const estimacion = await deps.storage.estimar().catch(() => ({ disponibleBytes: 0 }));
      disponibleBytes = estimacion.disponibleBytes;
    }

    const obligatorias = tarea !== 'almacenamiento';
    if (obligatorias && resultado.estado === 'error') {
      bloqueada = true;
    }
  }

  const completa = estados
    .filter((estado) => estado.tarea !== 'almacenamiento')
    .every((estado) => estado.estado === 'ok' || estado.estado === 'advertencia');

  await deps.meta.guardar(CLAVES_META.configuracionInicialCompleta, completa);
  deps.logger.info('setup.completado', { completa });

  return { completa, estados, ...(disponibleBytes === undefined ? {} : { disponibleBytes }) };
}
