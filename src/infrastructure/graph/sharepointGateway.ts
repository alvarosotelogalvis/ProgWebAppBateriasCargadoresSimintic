import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type {
  ArchivoRemoto,
  EntradaLogSync,
  RemoteGatewayPush,
  ResultadoActualizacion,
  ServicioRemotoPush,
} from '@/application/ports/RemoteGatewayPush';
import type {
  ArchivoRemotoServicio,
  CambiosServicios,
  RemoteGatewayPull,
} from '@/application/ports/RemoteGatewayPull';
import type { Catalogos, ClienteCatalogo, SitioResuelto } from '@/application/ports/remoteGateway';
import { ConflictoError } from '@/application/sync/ConflictoError';
import type { Entorno } from '@/shared/env';
import type { RemotoCambio } from '@/domain/sync/remoto';
import { AppError } from '@/shared/errors';

import { esValorUnicoDuplicado } from './errores';
import { normalizarETag } from './etag';
import type { GraphClient } from './graphClient';
import {
  mapearChoices,
  mapearClientes,
  mapearConfiguracion,
  mapearMarcas,
  type ColumnaGraph,
  type ItemGraph,
} from './mappers/catalogos';
import { itemACambio } from './mappers/cambioRemotoMapper';
import { CLAVES_META, COLUMNAS_CHOICE, type ColumnaChoice } from '@/application/setup/claves';

const LISTAS_REQUERIDAS = [
  'Servicios',
  'Clientes',
  'Marcas',
  'ConfiguracionApp',
  'LogSincronizacion',
  'ServiciosAdjuntos',
] as const;

interface ListaGraph {
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
}

interface ItemPushGraph extends ItemGraph {
  readonly '@removed'?: unknown;
  readonly '@odata.etag'?: string;
  readonly eTag?: string;
  readonly webUrl?: string;
  readonly lastModifiedDateTime?: string;
}

const leerEtag = (item: ItemPushGraph | undefined): string | undefined => {
  if (!item) return undefined;
  const etag = item['@odata.etag'] ?? item.eTag;
  return etag === undefined ? undefined : normalizarETag(etag);
};

const escaparOdata = (valor: string): string => valor.replace(/'/g, "''");

const itemARemoto = (item: ItemPushGraph): ServicioRemotoPush => {
  if (item.id === undefined) {
    throw new AppError({
      codigo: 'SP_SERVIDOR',
      mensaje: 'SharePoint devolvió un ítem sin identificador.',
      reintentable: true,
    });
  }
  const eTag = leerEtag(item);
  return {
    id: String(item.id),
    fields: item.fields ?? {},
    ...(eTag ? { eTag } : {}),
    ...(item.webUrl ? { webUrl: item.webUrl } : {}),
    ...(item.lastModifiedDateTime ? { modificadoEn: item.lastModifiedDateTime } : {}),
  };
};

const errorNumeroDuplicado = (causa: unknown): AppError =>
  new AppError({
    codigo: 'SP_NUMERO_DUPLICADO',
    mensaje: 'Otro dispositivo tomó el mismo número de solicitud.',
    claveI18n: 'errores.codigo.SP_NUMERO_DUPLICADO',
    reintentable: true,
    estadoHttp: 400,
    causa,
  });

export interface DepsSharePointGateway {
  readonly graph: GraphClient;
  readonly env: Entorno;
  readonly meta: MetaRepository;
  readonly logger: Logger;
  /** Para descargar miniaturas con URL prefirmada (sin token). Por defecto, `fetch`. */
  readonly fetchImpl?: typeof fetch;
}

export class SharePointGateway implements RemoteGatewayPush, RemoteGatewayPull {
  private sitio: SitioResuelto | undefined;

  constructor(private readonly deps: DepsSharePointGateway) {}

  async resolverSitio(): Promise<SitioResuelto> {
    const { hostname, pathname } = new URL(this.deps.env.VITE_SHAREPOINT_SITE_URL);
    const ruta =
      pathname && pathname !== '/' ? pathname : `/sites/${this.deps.env.VITE_SHAREPOINT_SITE_NAME}`;

    const sitio = await this.deps.graph.enviar<{ id: string; webUrl: string }>({
      metodo: 'GET',
      ruta: `/sites/${hostname}:${ruta}?$select=id,webUrl`,
    });

    const listasRespuesta = await this.deps.graph.enviar<{ value?: ListaGraph[] }>({
      metodo: 'GET',
      ruta: `/sites/${sitio.datos.id}/lists?$select=id,name,displayName`,
    });

    const listas: Record<string, string> = {};
    for (const lista of listasRespuesta.datos.value ?? []) {
      listas[lista.name] = lista.id;
    }

    const faltantes = LISTAS_REQUERIDAS.filter((nombre) => !listas[nombre]);
    if (faltantes.length > 0) {
      throw new AppError({
        codigo: 'SP_NO_ENCONTRADO',
        mensaje: `Faltan listas en SharePoint: ${faltantes.join(', ')}`,
        claveI18n: 'errores.codigo.SP_NO_ENCONTRADO',
        detalles: { faltantes },
      });
    }

    const drive = await this.deps.graph.enviar<{ id: string }>({
      metodo: 'GET',
      ruta: `/sites/${sitio.datos.id}/lists/${listas.ServiciosAdjuntos}/drive?$select=id`,
    });

    const resuelto: SitioResuelto = {
      siteId: sitio.datos.id,
      webUrl: sitio.datos.webUrl,
      listas,
      driveId: drive.datos.id,
    };

    await this.guardarSitio(resuelto);
    this.sitio = resuelto;
    this.deps.logger.info('setup.sitio.resuelto', {
      siteId: resuelto.siteId,
      listas: Object.keys(listas),
    });
    return resuelto;
  }

  async leerCatalogos(): Promise<Catalogos> {
    const sitio = await this.obtenerSitio();
    const [clientes, marcas, choices] = await Promise.all([
      this.leerClientes(sitio),
      this.leerMarcas(sitio),
      this.leerChoices(sitio),
    ]);
    return { clientes, marcas, choices };
  }

  async leerConfiguracion(): Promise<Record<string, string>> {
    const sitio = await this.obtenerSitio();
    const items: ItemGraph[] = [];
    for await (const item of this.deps.graph.paginar<ItemGraph>(
      `/sites/${sitio.siteId}/lists/${sitio.listas.ConfiguracionApp}/items?$expand=fields($select=Title,Valor)&$top=999`
    )) {
      items.push(item);
    }
    return mapearConfiguracion(items);
  }

  private async leerClientes(sitio: SitioResuelto): Promise<ClienteCatalogo[]> {
    const items: ItemGraph[] = [];
    for await (const item of this.deps.graph.paginar<ItemGraph>(
      `/sites/${sitio.siteId}/lists/${sitio.listas.Clientes}/items?$expand=fields($select=Title,Activo)&$top=999`
    )) {
      items.push(item);
    }
    return mapearClientes(items);
  }

  private async leerMarcas(sitio: SitioResuelto): Promise<string[]> {
    const items: ItemGraph[] = [];
    for await (const item of this.deps.graph.paginar<ItemGraph>(
      `/sites/${sitio.siteId}/lists/${sitio.listas.Marcas}/items?$expand=fields($select=Title,Activo)&$top=999`
    )) {
      items.push(item);
    }
    return mapearMarcas(items);
  }

  private async leerChoices(sitio: SitioResuelto): Promise<Record<ColumnaChoice, string[]>> {
    const columnas: ColumnaGraph[] = [];
    for (const lista of [sitio.listas.Servicios, sitio.listas.ServiciosAdjuntos]) {
      const respuesta = await this.deps.graph.enviar<{ value?: ColumnaGraph[] }>({
        metodo: 'GET',
        ruta: `/sites/${sitio.siteId}/lists/${lista}/columns?$select=name,choice`,
      });
      columnas.push(...(respuesta.datos.value ?? []));
    }
    const choices = mapearChoices(columnas);
    const vacias = COLUMNAS_CHOICE.filter((columna) => choices[columna].length === 0);
    if (vacias.length > 0) {
      this.deps.logger.warn('setup.choices.vacias', { columnas: vacias });
    }
    return choices;
  }

  private async guardarSitio(sitio: SitioResuelto): Promise<void> {
    await this.deps.meta.guardar(CLAVES_META.siteId, sitio.siteId);
    await this.deps.meta.guardar(CLAVES_META.webUrl, sitio.webUrl);
    await this.deps.meta.guardar(CLAVES_META.listIds, sitio.listas);
    await this.deps.meta.guardar(CLAVES_META.driveId, sitio.driveId);
  }

  private async obtenerSitio(): Promise<SitioResuelto> {
    if (this.sitio) return this.sitio;

    const siteId = await this.deps.meta.obtener<string>(CLAVES_META.siteId);
    const listas = await this.deps.meta.obtener<Record<string, string>>(CLAVES_META.listIds);
    const driveId = await this.deps.meta.obtener<string>(CLAVES_META.driveId);
    const webUrl = await this.deps.meta.obtener<string>(CLAVES_META.webUrl);

    if (!siteId || !listas || !driveId) {
      return this.resolverSitio();
    }

    this.sitio = { siteId, webUrl: webUrl ?? '', listas, driveId };
    return this.sitio;
  }

  // Operaciones de push (spec 005)
  async buscarServicioPorId(servicioId: string): Promise<ServicioRemotoPush | null> {
    const sitio = await this.obtenerSitio();
    const item = await this.buscarItemServicio(sitio, servicioId);
    return item ? itemARemoto(item) : null;
  }

  private async buscarItemServicio(
    sitio: SitioResuelto,
    servicioId: string
  ): Promise<ItemPushGraph | null> {
    const iterador = this.deps.graph.paginar<ItemPushGraph>(
      `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items?$filter=fields/ServicioId eq '${escaparOdata(
        servicioId
      )}'&$expand=fields($select=*)&$top=1`
    );
    for await (const item of iterador) {
      if (item.id !== undefined) return item;
    }
    return null;
  }

  async crearServicio(campos: Record<string, unknown>): Promise<ServicioRemotoPush> {
    const sitio = await this.obtenerSitio();
    try {
      const respuesta = await this.deps.graph.enviar<ItemPushGraph>({
        metodo: 'POST',
        ruta: `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items`,
        cuerpo: { fields: campos },
      });
      if (respuesta.datos.id === undefined) {
        throw new AppError({
          codigo: 'SP_SERVIDOR',
          mensaje: 'SharePoint no devolvió el ítem creado.',
          reintentable: true,
        });
      }
      return itemARemoto({
        ...respuesta.datos,
        fields: respuesta.datos.fields ?? campos,
      });
    } catch (error) {
      // Carrera de idempotencia: el valor único ServicioId ya existe (SDD §9.2). SharePoint real
      // lo responde con 400 (no 409): ver `esValorUnicoDuplicado`.
      if (esValorUnicoDuplicado(error)) {
        const servicioId = campos.ServicioId;
        if (typeof servicioId === 'string') {
          const encontrado = await this.buscarItemServicio(sitio, servicioId);
          if (encontrado) return itemARemoto(encontrado);
        }
        // Si no es el ServicioId, el choque es del NumeroSolicitud: otro dispositivo tomó ese número.
        if (campos.NumeroSolicitud !== undefined) throw errorNumeroDuplicado(error);
      }
      throw error;
    }
  }

  async ultimoNumeroSolicitud(): Promise<number> {
    const sitio = await this.obtenerSitio();
    const respuesta = await this.deps.graph.enviar<{ value?: ItemPushGraph[] }>({
      metodo: 'GET',
      ruta: `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items?$expand=fields($select=NumeroSolicitud)&$orderby=fields/NumeroSolicitud desc&$top=1`,
    });
    const numero = Number(respuesta.datos.value?.[0]?.fields?.NumeroSolicitud ?? 0);
    return Number.isFinite(numero) && numero > 0 ? numero : 0;
  }

  async contarPorNumeroSolicitud(numero: number): Promise<readonly { readonly itemId: string }[]> {
    const sitio = await this.obtenerSitio();
    const ids: { itemId: string }[] = [];
    const iterador = this.deps.graph.paginar<ItemPushGraph>(
      `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items?$filter=fields/NumeroSolicitud eq ${Math.trunc(numero)}&$select=id`
    );
    for await (const item of iterador) {
      if (item.id !== undefined) ids.push({ itemId: String(item.id) });
    }
    return ids;
  }

  async renumerarServicio(
    itemId: string,
    numero: number,
    codigo: string
  ): Promise<ResultadoActualizacion> {
    try {
      // Sin If-Match: el ítem es nuestro y acaba de crearse. Devuelve el eTag nuevo.
      return await this.actualizarServicio(itemId, { NumeroSolicitud: numero, Title: codigo });
    } catch (error) {
      if (esValorUnicoDuplicado(error)) throw errorNumeroDuplicado(error);
      throw error;
    }
  }

  async actualizarServicio(
    itemId: string,
    campos: Record<string, unknown>,
    etag?: string
  ): Promise<ResultadoActualizacion> {
    const sitio = await this.obtenerSitio();
    const cabeceras: Record<string, string> = {};
    if (etag) cabeceras['If-Match'] = etag;

    try {
      const respuesta = await this.deps.graph.enviar<ItemPushGraph>({
        metodo: 'PATCH',
        ruta: `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items/${itemId}/fields`,
        cuerpo: campos,
        cabeceras,
      });

      const eTagRespuesta = leerEtag(respuesta.datos);
      if (eTagRespuesta) return { eTag: eTagRespuesta };

      // El endpoint de fields no siempre devuelve el eTag del ítem (spike S3):
      // se relee para que el siguiente PATCH no falle con un eTag viejo.
      const actual = await this.deps.graph.enviar<ItemPushGraph>({
        metodo: 'GET',
        ruta: `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items/${itemId}?$select=id,eTag,webUrl,lastModifiedDateTime`,
      });
      const eTag = leerEtag(actual.datos);
      return eTag ? { eTag } : {};
    } catch (error) {
      if (error instanceof AppError && error.estadoHttp === 412) {
        throw new ConflictoError(undefined, { itemId, campos: Object.keys(campos) });
      }
      throw error;
    }
  }

  async listarAdjuntosDeServicio(servicioId: string): Promise<readonly ArchivoRemoto[]> {
    const sitio = await this.obtenerSitio();
    const items: ArchivoRemoto[] = [];
    const iterador = this.deps.graph.paginar<ItemPushGraph>(
      `/sites/${sitio.siteId}/lists/${sitio.listas.ServiciosAdjuntos}/items?$filter=fields/ServicioId eq '${escaparOdata(
        servicioId
      )}'&$expand=fields($select=*)`
    );
    for await (const item of iterador) {
      if (item.id === undefined) continue;
      const nombre = item.fields?.NombreArchivo ?? item.fields?.Title;
      const eTag = leerEtag(item);
      items.push({
        id: String(item.id),
        name: typeof nombre === 'string' ? nombre : '',
        ...(eTag ? { eTag } : {}),
        ...(item.webUrl ? { webUrl: item.webUrl } : {}),
      });
    }
    return items;
  }

  async eliminarArchivo(itemId: string): Promise<void> {
    const sitio = await this.obtenerSitio();
    await this.deps.graph.enviar({
      metodo: 'DELETE',
      ruta: `/drives/${sitio.driveId}/items/${itemId}`,
    });
  }

  async actualizarMetadatosArchivo(
    itemId: string,
    metadatos: Record<string, unknown>
  ): Promise<void> {
    const sitio = await this.obtenerSitio();
    await this.deps.graph.enviar({
      metodo: 'PATCH',
      ruta: `/drives/${sitio.driveId}/items/${itemId}/listItem/fields`,
      cuerpo: metadatos,
    });
  }

  async registrarLogSync(entrada: EntradaLogSync): Promise<void> {
    const sitio = await this.obtenerSitio();
    await this.deps.graph.enviar({
      metodo: 'POST',
      ruta: `/sites/${sitio.siteId}/lists/${sitio.listas.LogSincronizacion}/items`,
      cuerpo: {
        fields: {
          Title: entrada.correlationId,
          Usuario: entrada.usuario,
          Dispositivo: entrada.dispositivo,
          AppVersion: entrada.appVersion,
          Inicio: entrada.inicio,
          Fin: entrada.fin,
          Resultado: entrada.resultado,
          ServiciosSubidos: entrada.serviciosSubidos,
          ArchivosSubidos: entrada.archivosSubidos,
          ServiciosDescargados: entrada.serviciosDescargados,
          Conflictos: entrada.conflictos,
          Errores: entrada.errores,
        },
      },
      timeoutMs: 10_000,
    });
  }

  // Operaciones de pull (spec 006)

  async cambiosServicios(deltaLink?: string, signal?: AbortSignal): Promise<CambiosServicios> {
    const sitio = await this.obtenerSitio();
    const inicio = `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items/delta?$expand=fields`;
    try {
      return await this.recorrerDelta(
        deltaLink ?? inicio,
        deltaLink ? 'delta' : 'completa',
        signal
      );
    } catch (error) {
      // 410 Gone: el deltaLink caducó. Se descarga todo de nuevo (FR-006-10).
      if (deltaLink !== undefined && error instanceof AppError && error.estadoHttp === 410) {
        this.deps.logger.warn('pull.delta.caducado', { siteId: sitio.siteId });
        return this.recorrerDelta(inicio, 'completa', signal);
      }
      throw error;
    }
  }

  private async recorrerDelta(
    rutaInicial: string,
    metodo: CambiosServicios['metodo'],
    signal: AbortSignal | undefined
  ): Promise<CambiosServicios> {
    const cambios: RemotoCambio[] = [];
    let ruta: string | undefined = rutaInicial;
    let deltaLink: string | undefined;

    while (ruta !== undefined) {
      signal?.throwIfAborted();
      const respuesta: { datos: DeltaGraph } = await this.deps.graph.enviar<DeltaGraph>({
        metodo: 'GET',
        ruta,
        ...(signal ? { signal } : {}),
      });
      for (const item of respuesta.datos.value ?? []) {
        if (item.id === undefined) continue;
        cambios.push(itemACambio(item));
      }
      deltaLink = respuesta.datos['@odata.deltaLink'];
      ruta = respuesta.datos['@odata.nextLink'];
    }

    return { cambios, metodo, ...(deltaLink ? { deltaLink } : {}) };
  }

  async leerServicioRemoto(servicioId: string, signal?: AbortSignal): Promise<RemotoCambio | null> {
    signal?.throwIfAborted();
    const sitio = await this.obtenerSitio();
    const item = await this.buscarItemServicio(sitio, servicioId);
    return item && item.id !== undefined ? itemACambio(item) : null;
  }

  async listarArchivosServicio(
    carpeta: string,
    signal?: AbortSignal
  ): Promise<readonly ArchivoRemotoServicio[]> {
    const sitio = await this.obtenerSitio();
    const ruta = carpeta.split('/').map(encodeURIComponent).join('/');
    const archivos: ArchivoRemotoServicio[] = [];
    try {
      for await (const item of this.deps.graph.paginar<ArchivoGraph>(
        `/drives/${sitio.driveId}/root:/${ruta}:/children?$select=id,name,size,webUrl,eTag,file&$top=200`,
        signal ? { signal } : {}
      )) {
        if (item.file === undefined) continue; // subcarpetas
        archivos.push({
          id: item.id,
          nombre: item.name,
          tamanoBytes: item.size ?? 0,
          webUrl: item.webUrl ?? '',
          ...(item.eTag ? { eTag: item.eTag } : {}),
        });
      }
    } catch (error) {
      if (error instanceof AppError && error.estadoHttp === 404) return [];
      throw error;
    }
    return archivos;
  }

  async descargarMiniatura(driveItemId: string, signal?: AbortSignal): Promise<Blob | null> {
    const sitio = await this.obtenerSitio();
    const respuesta = await this.deps.graph.enviar<{
      value?: Array<{ small?: { url?: string }; medium?: { url?: string } }>;
    }>({
      metodo: 'GET',
      ruta: `/drives/${sitio.driveId}/items/${driveItemId}/thumbnails`,
      ...(signal ? { signal } : {}),
    });
    const miniaturas = respuesta.datos.value?.[0];
    const url = miniaturas?.small?.url ?? miniaturas?.medium?.url;
    if (!url) return null;
    // La URL ya viene autorizada: no se envía el token de Graph a otro host.
    const ejecutar = this.deps.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
    const archivo = await ejecutar(url, signal ? { signal } : {});
    if (!archivo.ok) return null;
    return archivo.blob();
  }
}

interface DeltaGraph {
  readonly value?: ItemPushGraph[];
  readonly '@odata.nextLink'?: string;
  readonly '@odata.deltaLink'?: string;
}

interface ArchivoGraph {
  readonly id: string;
  readonly name: string;
  readonly size?: number;
  readonly webUrl?: string;
  readonly eTag?: string;
  readonly file?: unknown;
}
