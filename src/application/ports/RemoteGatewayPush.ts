import type { Catalogos, SitioResuelto } from './remoteGateway';

export interface ServicioRemotoPush {
  readonly id: string;
  readonly fields: Record<string, unknown>;
  readonly eTag?: string;
  readonly webUrl?: string;
  readonly modificadoEn?: string;
}

export interface ResultadoActualizacion {
  readonly eTag?: string;
}

export interface ArchivoRemoto {
  readonly id: string;
  readonly name: string;
  readonly eTag?: string;
  readonly webUrl?: string;
}

export type ResultadoLogSync = 'OK' | 'Parcial' | 'Error';

export interface EntradaLogSync {
  readonly correlationId: string;
  readonly usuario: string;
  readonly dispositivo: string;
  readonly appVersion: string;
  readonly inicio: string;
  readonly fin: string;
  readonly resultado: ResultadoLogSync;
  readonly serviciosSubidos: number;
  readonly archivosSubidos: number;
  readonly serviciosDescargados: number;
  readonly conflictos: number;
  readonly errores: string;
}

/**
 * Operaciones de escritura que necesita el push (SDD §4.3, §7.3).
 * El adaptador traduce los campos del dominio a columnas de SharePoint.
 */
export interface RemoteGatewayPush {
  resolverSitio(): Promise<SitioResuelto>;
  leerCatalogos(): Promise<Catalogos>;
  leerConfiguracion(): Promise<Record<string, string>>;
  buscarServicioPorId(servicioId: string): Promise<ServicioRemotoPush | null>;
  crearServicio(campos: Record<string, unknown>): Promise<ServicioRemotoPush>;
  actualizarServicio(
    itemId: string,
    campos: Record<string, unknown>,
    etag?: string
  ): Promise<ResultadoActualizacion>;
  listarAdjuntosDeServicio(servicioId: string): Promise<readonly ArchivoRemoto[]>;
  eliminarArchivo(itemId: string): Promise<void>;
  actualizarMetadatosArchivo(itemId: string, metadatos: Record<string, unknown>): Promise<void>;
  registrarLogSync?(entrada: EntradaLogSync): Promise<void>;
}
