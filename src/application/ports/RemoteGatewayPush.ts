import type { SitioResuelto, Catalogos } from './remoteGateway';

export interface ServicioRemotoPush {
  readonly id?: string;
  readonly fields: Record<string, unknown>;
}

export interface ArchivoRemoto {
  readonly id: string;
  readonly name: string;
  readonly '@odata.etag'?: string;
}

export interface RemoteGatewayPush {
  resolverSitio(): Promise<SitioResuelto>;
  leerCatalogos(): Promise<Catalogos>;
  leerConfiguracion(): Promise<Record<string, string>>;
  buscarServicioPorId(servicioId: string): Promise<ServicioRemotoPush | null>;
  crearServicio(campos: Record<string, unknown>): Promise<ServicioRemotoPush>;
  actualizarServicio(itemId: string, campos: Record<string, unknown>, etag?: string): Promise<void>;
  listarAdjuntosDeServicio(servicioId: string): Promise<readonly ArchivoRemoto[]>;
  eliminarArchivo(itemId: string): Promise<void>;
  actualizarMetadatosArchivo(itemId: string, metadatos: Record<string, unknown>): Promise<void>;
}
