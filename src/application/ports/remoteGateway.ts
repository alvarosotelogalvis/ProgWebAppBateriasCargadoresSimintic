import type { ColumnaChoice } from '@/application/setup/claves';

export interface SitioResuelto {
  readonly siteId: string;
  readonly webUrl: string;
  readonly listas: Readonly<Record<string, string>>;
  readonly driveId: string;
}

export interface ClienteCatalogo {
  readonly id: number;
  readonly nombre: string;
  readonly activo: boolean;
}

export interface Catalogos {
  readonly clientes: readonly ClienteCatalogo[];
  readonly marcas: readonly string[];
  readonly choices: Readonly<Record<ColumnaChoice, readonly string[]>>;
}

export interface CambioServicio {
  readonly id: string;
  readonly servicioId: string;
  readonly fields: Record<string, unknown>;
  readonly itemId?: string;
  readonly deleted?: boolean;
  readonly modified?: string;
  readonly editor?: string;
  readonly editorNombre?: string;
}

export interface CambiosServicios {
  readonly cambios: readonly CambioServicio[];
  readonly deltaLink?: string;
}

export interface RemoteGateway {
  resolverSitio(): Promise<SitioResuelto>;
  leerCatalogos(): Promise<Catalogos>;
  leerConfiguracion(): Promise<Record<string, string>>;
  // Pull operations (T-011)
  cambiosServicios(deltaLinkAnterior?: string): Promise<CambiosServicios>;
  listarArchivosServicio(
    servicioId: string
  ): Promise<Array<{ id: string; name: string; size: number; webUrl: string }>>;
  descargarMiniatura(url: string): Promise<Blob>;
}
