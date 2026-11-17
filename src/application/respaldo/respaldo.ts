import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { UnidadDeTrabajo } from '@/application/ports/unidadDeTrabajo';
import type { ArchivoEnZip, ZipPort } from '@/application/ports/zipPort';
import type { ClientesLocales } from '@/application/clientes/clientesLocales';
import type { Adjunto } from '@/domain/adjunto';
import type { ClienteNuevo } from '@/domain/cliente';
import { crearManifiesto, validarManifiesto } from '@/domain/respaldo';
import type { Servicio } from '@/domain/servicio';

export type AlcanceRespaldo = 'solo-pendientes' | 'todos';

export interface ResultadoExportar {
  blob: Blob;
  tamanoEstimado: number;
  nombreArchivo: string;
  serviciosIncluidos: number;
  adjuntosIncluidos: number;
}

export interface ResultadoImportar {
  importados: number;
  omitidos: number;
  adjuntosImportados: number;
}

export class RespaldoInvalidoError extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'RespaldoInvalidoError';
  }
}

/** Metadatos de un adjunto en `adjuntos.json`; el contenido va en `archivos/` y `miniaturas/`. */
type AdjuntoRespaldado = Omit<Adjunto, 'blob' | 'miniatura'> & {
  tieneArchivo: boolean;
  tieneMiniatura: boolean;
};

const RUTA_MANIFIESTO = 'manifiesto.json';
const RUTA_SERVICIOS = 'servicios.json';
const RUTA_ADJUNTOS = 'adjuntos.json';
/** Clientes creados sin red que aún no están en SharePoint; opcional (los respaldos anteriores no lo traen). */
const RUTA_CLIENTES_NUEVOS = 'clientesNuevos.json';
const rutaArchivo = (id: string): string => `archivos/${id}`;
const rutaMiniatura = (id: string): string => `miniaturas/${id}`;

/** «Pendiente» = todo lo que aún no está en SharePoint, incluidos borradores y errores. */
const estaPendiente = (servicio: Servicio): boolean => servicio.syncState !== 'synced';

/** Los adjuntos que solo existen en SharePoint se vuelven a listar al sincronizar: no se respaldan. */
const respaldable = (adjunto: Adjunto): boolean =>
  adjunto.blob !== null || adjunto.eliminarRemoto || adjunto.syncState !== 'synced';

export interface DepsExportar {
  readonly servicios: ServicioRepository;
  readonly adjuntos: AdjuntoRepository;
  readonly zip: ZipPort;
  readonly appVersion: string;
  readonly dispositivoId: () => Promise<string>;
  readonly ahora?: () => Date;
  /** Clientes pendientes de subir: un servicio con cliente temporal no se restaura sin ellos (spec 010). */
  readonly clientesNuevos?: () => Promise<readonly ClienteNuevo[]>;
}

/** Empaqueta los servicios (completos), sus metadatos de adjuntos y los archivos en un ZIP. */
export async function exportarRespaldo(
  deps: DepsExportar,
  alcance: AlcanceRespaldo
): Promise<ResultadoExportar> {
  const todos = await deps.servicios.listarTodos();
  const aExportar = alcance === 'solo-pendientes' ? todos.filter(estaPendiente) : todos;

  const archivos: ArchivoEnZip[] = [];
  const metadatos: AdjuntoRespaldado[] = [];

  for (const servicio of aExportar) {
    for (const adjunto of await deps.adjuntos.listarPorServicio(servicio.id)) {
      if (!respaldable(adjunto)) continue;
      const { blob, miniatura, ...resto } = adjunto;
      metadatos.push({ ...resto, tieneArchivo: blob !== null, tieneMiniatura: miniatura !== null });
      if (blob)
        archivos.push({ ruta: rutaArchivo(adjunto.id), contenido: blob, tipo: adjunto.mime });
      if (miniatura) {
        archivos.push({
          ruta: rutaMiniatura(adjunto.id),
          contenido: miniatura,
          tipo: 'image/jpeg',
        });
      }
    }
  }

  const ahora = (deps.ahora ?? (() => new Date()))();
  const manifiesto = crearManifiesto(
    deps.appVersion,
    await deps.dispositivoId(),
    aExportar.filter(estaPendiente).length,
    metadatos.length,
    ahora
  );

  const contenido: ArchivoEnZip[] = [
    { ruta: RUTA_MANIFIESTO, contenido: JSON.stringify(manifiesto, null, 2) },
    { ruta: RUTA_SERVICIOS, contenido: JSON.stringify(aExportar) },
    { ruta: RUTA_ADJUNTOS, contenido: JSON.stringify(metadatos) },
    ...(deps.clientesNuevos
      ? [{ ruta: RUTA_CLIENTES_NUEVOS, contenido: JSON.stringify(await deps.clientesNuevos()) }]
      : []),
    ...archivos,
  ];

  return {
    blob: await deps.zip.empaquetar(contenido),
    tamanoEstimado: deps.zip.estimarTamano(contenido),
    nombreArchivo: `respaldo-${alcance}-${ahora.toISOString().slice(0, 10)}.zip`,
    serviciosIncluidos: aExportar.length,
    adjuntosIncluidos: metadatos.length,
  };
}

export interface DepsImportar {
  readonly servicios: ServicioRepository;
  readonly uow: UnidadDeTrabajo;
  readonly zip: ZipPort;
  /** Dónde guardar los clientes pendientes del respaldo (spec 010). Sin esto se ignoran. */
  readonly clientesNuevos?: Pick<ClientesLocales, 'agregarVarios'>;
}

const leerJson = async (
  zip: ZipPort,
  archivos: readonly ArchivoEnZip[],
  ruta: string
): Promise<unknown> => {
  const archivo = archivos.find((candidato) => candidato.ruta === ruta);
  if (!archivo) throw new RespaldoInvalidoError(`Falta ${ruta} en el respaldo`);
  const texto =
    typeof archivo.contenido === 'string'
      ? archivo.contenido
      : await zip.leerTexto(archivo.contenido);
  try {
    return JSON.parse(texto);
  } catch {
    throw new RespaldoInvalidoError(`${ruta} no es un JSON válido`);
  }
};

const esServicio = (valor: unknown): valor is Servicio =>
  typeof valor === 'object' &&
  valor !== null &&
  typeof (valor as Servicio).id === 'string' &&
  typeof (valor as Servicio).estado === 'string' &&
  Array.isArray((valor as Servicio).camposSucios);

const esClienteNuevo = (valor: unknown): valor is ClienteNuevo =>
  typeof valor === 'object' &&
  valor !== null &&
  typeof (valor as ClienteNuevo).id === 'number' &&
  typeof (valor as ClienteNuevo).guid === 'string' &&
  typeof (valor as ClienteNuevo).nombre === 'string' &&
  typeof (valor as ClienteNuevo).normalizado === 'string';

const esAdjunto = (valor: unknown): valor is AdjuntoRespaldado =>
  typeof valor === 'object' &&
  valor !== null &&
  typeof (valor as AdjuntoRespaldado).id === 'string' &&
  typeof (valor as AdjuntoRespaldado).servicioId === 'string';

/** Un envío interrumpido no deja de estar pendiente al llegar a otro dispositivo. */
const sinEnvioEnCurso = <T extends { syncState: Servicio['syncState'] }>(registro: T): T =>
  registro.syncState === 'syncing' ? { ...registro, syncState: 'pending' } : registro;

/**
 * Restaura un respaldo. Todo o nada: se valida el paquete completo antes de escribir y se guarda en
 * una sola transacción. Nunca sobrescribe un servicio que ya existe en el dispositivo (se omite).
 */
export async function importarRespaldo(deps: DepsImportar, blob: Blob): Promise<ResultadoImportar> {
  const archivos = await deps.zip.desempaquetar(blob);

  const validacion = validarManifiesto(await leerJson(deps.zip, archivos, RUTA_MANIFIESTO));
  if (!validacion.ok) throw new RespaldoInvalidoError(validacion.error ?? 'Respaldo no válido');

  const servicios = await leerJson(deps.zip, archivos, RUTA_SERVICIOS);
  const adjuntos = await leerJson(deps.zip, archivos, RUTA_ADJUNTOS);
  if (!Array.isArray(servicios) || !servicios.every(esServicio)) {
    throw new RespaldoInvalidoError('servicios.json no tiene el formato esperado');
  }
  if (!Array.isArray(adjuntos) || !adjuntos.every(esAdjunto)) {
    throw new RespaldoInvalidoError('adjuntos.json no tiene el formato esperado');
  }

  // Opcional: los respaldos anteriores a la spec 010 no lo traen. Si está, debe ser válido (todo o nada).
  const hayClientes = archivos.some((archivo) => archivo.ruta === RUTA_CLIENTES_NUEVOS);
  const clientesNuevos = hayClientes
    ? await leerJson(deps.zip, archivos, RUTA_CLIENTES_NUEVOS)
    : [];
  if (!Array.isArray(clientesNuevos) || !clientesNuevos.every(esClienteNuevo)) {
    throw new RespaldoInvalidoError('clientesNuevos.json no tiene el formato esperado');
  }

  const contenidoDe = (ruta: string): Blob | null => {
    const archivo = archivos.find((candidato) => candidato.ruta === ruta);
    return archivo && typeof archivo.contenido !== 'string' ? archivo.contenido : null;
  };

  const nuevos: Servicio[] = [];
  let omitidos = 0;
  for (const servicio of servicios) {
    if (await deps.servicios.obtener(servicio.id)) omitidos += 1;
    else nuevos.push(sinEnvioEnCurso(servicio));
  }
  const idsNuevos = new Set(nuevos.map((servicio) => servicio.id));

  const adjuntosNuevos: Adjunto[] = adjuntos
    .filter((adjunto) => idsNuevos.has(adjunto.servicioId))
    .map(({ tieneArchivo, tieneMiniatura, ...resto }) => {
      const archivo = tieneArchivo ? contenidoDe(rutaArchivo(resto.id)) : null;
      const miniatura = tieneMiniatura ? contenidoDe(rutaMiniatura(resto.id)) : null;
      if (tieneArchivo && !archivo) {
        throw new RespaldoInvalidoError(`Falta el archivo del adjunto ${resto.id}`);
      }
      return sinEnvioEnCurso({
        ...resto,
        blob: archivo ? new Blob([archivo], { type: resto.mime }) : null,
        miniatura,
      });
    });

  // Primero los clientes: así ningún servicio restaurado apunta a un cliente que no existe en el dispositivo.
  // Si la transacción de abajo falla quedan clientes sin uso, que nunca se suben a SharePoint (no se crean si nadie los usa).
  if (deps.clientesNuevos && nuevos.length > 0)
    await deps.clientesNuevos.agregarVarios(clientesNuevos);

  await deps.uow.ejecutar(async (repos) => {
    for (const servicio of nuevos) await repos.servicios.guardar(servicio);
    for (const adjunto of adjuntosNuevos) await repos.adjuntos.guardar(adjunto);
  });

  return { importados: nuevos.length, omitidos, adjuntosImportados: adjuntosNuevos.length };
}
