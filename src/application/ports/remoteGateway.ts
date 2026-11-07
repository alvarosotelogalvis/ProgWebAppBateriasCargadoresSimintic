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

export interface RemoteGateway {
  resolverSitio(): Promise<SitioResuelto>;
  leerCatalogos(): Promise<Catalogos>;
  leerConfiguracion(): Promise<Record<string, string>>;
}
