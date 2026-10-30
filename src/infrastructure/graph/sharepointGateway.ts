import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { ArchivoRemoto, ServicioRemotoPush } from '@/application/ports/RemoteGatewayPush';
import type {
  Catalogos,
  ClienteCatalogo,
  RemoteGateway,
  SitioResuelto,
} from '@/application/ports/remoteGateway';
import type { Entorno } from '@/shared/env';
import { AppError } from '@/shared/errors';

import type { GraphClient } from './graphClient';
import {
  mapearChoices,
  mapearClientes,
  mapearConfiguracion,
  mapearMarcas,
  type ColumnaGraph,
  type ItemGraph,
} from './mappers/catalogos';
import { CLAVES_META, COLUMNAS_CHOICE, type ColumnaChoice } from '@/application/setup/claves';

const LISTAS_REQUERIDAS = [
  'Servicios',
  'Clientes',
  'Marcas',
  'ConfiguracionApp',
  'ServiciosAdjuntos',
] as const;

interface ListaGraph {
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
}

interface ItemAdjuntoGraph extends ItemGraph {
  readonly '@odata.etag'?: string;
}

export interface DepsSharePointGateway {
  readonly graph: GraphClient;
  readonly env: Entorno;
  readonly meta: MetaRepository;
  readonly logger: Logger;
}

export class SharePointGateway implements RemoteGateway {
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
    try {
      const items: ItemGraph[] = [];
      const iterador = this.deps.graph.paginar<ItemGraph>(
        `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items?$filter=fields/ServicioId eq '${servicioId}'&$expand=fields($select=*)`
      );
      for await (const item of iterador) {
        items.push(item);
      }
      const encontrado = items[0];
      if (encontrado?.id !== undefined) {
        return {
          id: String(encontrado.id),
          ...(encontrado.fields ? { fields: encontrado.fields } : { fields: {} }),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async crearServicio(campos: Record<string, unknown>): Promise<ServicioRemotoPush> {
    const sitio = await this.obtenerSitio();
    try {
      const respuesta = await this.deps.graph.enviar<ItemGraph>({
        metodo: 'POST',
        ruta: `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items`,
        cuerpo: { fields: campos },
      });
      return {
        ...(respuesta.datos.id !== undefined ? { id: String(respuesta.datos.id) } : {}),
        fields: respuesta.datos.fields ?? campos,
      };
    } catch (error) {
      if (error instanceof AppError && error.estadoHttp === 409) {
        const servicioId = campos.ServicioId;
        if (typeof servicioId === 'string') {
          const encontrado = await this.buscarServicioPorId(servicioId);
          if (encontrado) return encontrado;
        }
      }
      throw error;
    }
  }

  async actualizarServicio(
    itemId: string,
    campos: Record<string, unknown>,
    etag?: string
  ): Promise<void> {
    const sitio = await this.obtenerSitio();
    const cabeceras: Record<string, string> = {};
    if (etag) cabeceras['If-Match'] = etag;
    await this.deps.graph.enviar({
      metodo: 'PATCH',
      ruta: `/sites/${sitio.siteId}/lists/${sitio.listas.Servicios}/items/${itemId}/fields`,
      cuerpo: campos,
      cabeceras,
    });
  }

  async listarAdjuntosDeServicio(servicioId: string): Promise<readonly ArchivoRemoto[]> {
    const sitio = await this.obtenerSitio();
    const items: ArchivoRemoto[] = [];
    const iterador = this.deps.graph.paginar<ItemAdjuntoGraph>(
      `/sites/${sitio.siteId}/lists/${sitio.listas.ServiciosAdjuntos}/items?$filter=fields/ServicioId eq '${servicioId}'&$expand=fields($select=*)`
    );
    for await (const item of iterador) {
      if (item.id === undefined) continue;
      const nombre = item.fields?.NombreArchivo ?? item.fields?.Title;
      items.push({
        id: String(item.id),
        name: typeof nombre === 'string' ? nombre : '',
        ...(item['@odata.etag'] ? { '@odata.etag': item['@odata.etag'] } : {}),
      });
    }
    return items;
  }

  async eliminarArchivo(itemId: string): Promise<void> {
    const sitio = await this.obtenerSitio();
    await this.deps.graph.enviar({
      metodo: 'DELETE',
      ruta: `/sites/${sitio.siteId}/lists/${sitio.listas.ServiciosAdjuntos}/items/${itemId}`,
    });
  }

  async actualizarMetadatosArchivo(
    itemId: string,
    metadatos: Record<string, unknown>
  ): Promise<void> {
    const sitio = await this.obtenerSitio();
    await this.deps.graph.enviar({
      metodo: 'PATCH',
      ruta: `/sites/${sitio.siteId}/lists/${sitio.listas.ServiciosAdjuntos}/items/${itemId}/fields`,
      cuerpo: metadatos,
    });
  }
}
