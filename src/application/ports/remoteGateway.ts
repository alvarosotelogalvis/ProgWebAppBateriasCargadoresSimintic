import type { ColumnaChoice } from '@/application/setup/claves';
import type { ClienteFusionado } from '@/domain/cliente';

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
  /** Clientes fusionados en otro (inactivos con destino). Ausente = ninguno (ADR-0023). */
  readonly fusionados?: readonly ClienteFusionado[];
  readonly marcas: readonly string[];
  readonly choices: Readonly<Record<ColumnaChoice, readonly string[]>>;
}

export interface RemoteGateway {
  resolverSitio(): Promise<SitioResuelto>;
  leerCatalogos(): Promise<Catalogos>;
  leerConfiguracion(): Promise<Record<string, string>>;
}
