import type {
  ArchivoRemoto,
  EntradaLogSync,
  RemoteGatewayPush,
  ResultadoActualizacion,
  ServicioRemotoPush,
} from '@/application/ports/RemoteGatewayPush';
import type { Catalogos, SitioResuelto } from '@/application/ports/remoteGateway';
import type {
  ArchivoRemotoServicio,
  CambiosServicios,
  RemoteGatewayPull,
} from '@/application/ports/RemoteGatewayPull';
import type { ItemSubido, Uploader } from '@/application/ports/UploaderPort';
import { ConflictoError } from '@/application/sync/ConflictoError';
import type { RemotoCambio } from '@/domain/sync/remoto';
import { AppError } from '@/shared/errors';

import { itemACambio } from './mappers/cambioRemotoMapper';

const CLIENTES_DEMO = [
  { id: 1, nombre: 'Navar Asociados', activo: true },
  { id: 2, nombre: 'Distribuidora Andina', activo: true },
  { id: 3, nombre: 'Transportes del Norte', activo: true },
];

const MARCAS_DEMO = ['ROQUET', 'TROJAN', 'BOSCH', 'DELTA', 'EXIDE'];

const CHOICES_DEMO: Catalogos['choices'] = {
  Diagnostico: ['D. FINAL', 'REPARAR', 'NO REPARABLE'],
  Estado: ['RECIBIDO', 'DIAGNOSTICADO', 'COTIZADO', 'EN_REPARACION', 'ENTREGADO'],
  CotizacionEstado: ['PENDIENTE', 'APROBADA', 'RECHAZADA'],
  TipoEquipo: ['BATERIA', 'CARGADOR'],
  TipoAdjunto: ['Foto ingreso', 'Factura', 'Evidencia', 'PDF'],
};

const CONFIG_DEMO: Record<string, string> = {
  MaxFotosIngreso: '5',
  MaxFotosEtapa: '5',
  DiasAlertaVidaUtil: '30',
  VersionMinimaApp: '0.1.0',
};

interface ItemMock {
  readonly id: string;
  fields: Record<string, unknown>;
  eTag: string;
  readonly webUrl: string;
  modificadoEn: string;
  /** Secuencia del último cambio: sirve de «deltaLink» en el modo demo. */
  version: number;
}

interface ArchivoMock {
  readonly id: string;
  readonly name: string;
  eTag: string;
  readonly webUrl: string;
  fields: Record<string, unknown>;
}

/**
 * Graph simulado en el navegador cuando VITE_AUTH_MODE=mock.
 * Permite recorrer el asistente y la app en DEV sin tenant (SDD 8.6).
 * En pruebas de integracion se usa el emulador de MSW, no este adaptador.
 */
export class MockRemoteGateway implements RemoteGatewayPush, RemoteGatewayPull {
  private readonly serviciosMock = new Map<string, ItemMock>();
  private readonly archivosMock = new Map<string, ArchivoMock>();
  private readonly logs: EntradaLogSync[] = [];
  private secuencia = 0;

  async resolverSitio(): Promise<SitioResuelto> {
    return {
      siteId: 'mock-site',
      webUrl: 'https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV',
      listas: {
        Servicios: 'mock-servicios',
        Clientes: 'mock-clientes',
        Marcas: 'mock-marcas',
        ConfiguracionApp: 'mock-configuracion',
        LogSincronizacion: 'mock-log',
        ServiciosAdjuntos: 'mock-adjuntos',
      },
      driveId: 'mock-drive',
    };
  }

  async leerCatalogos(): Promise<Catalogos> {
    return {
      clientes: CLIENTES_DEMO,
      marcas: MARCAS_DEMO,
      choices: CHOICES_DEMO,
    };
  }

  async leerConfiguracion(): Promise<Record<string, string>> {
    return { ...CONFIG_DEMO };
  }

  async buscarServicioPorId(servicioId: string): Promise<ServicioRemotoPush | null> {
    const encontrado = [...this.serviciosMock.values()].find(
      (item) => item.fields.ServicioId === servicioId
    );
    return encontrado ? this.aServicioRemoto(encontrado) : null;
  }

  async crearServicio(campos: Record<string, unknown>): Promise<ServicioRemotoPush> {
    const existente = await this.buscarServicioPorId(String(campos.ServicioId ?? ''));
    if (existente) return existente;

    this.secuencia += 1;
    const item: ItemMock = {
      id: `mock-servicio-${this.secuencia}`,
      fields: { ...campos },
      eTag: `"mock-${this.secuencia}"`,
      webUrl: `https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV/Lists/Servicios/${this.secuencia}`,
      modificadoEn: new Date().toISOString(),
      version: this.secuencia,
    };
    this.serviciosMock.set(item.id, item);
    return this.aServicioRemoto(item);
  }

  async actualizarServicio(
    itemId: string,
    campos: Record<string, unknown>,
    etag?: string
  ): Promise<ResultadoActualizacion> {
    const item = this.serviciosMock.get(itemId);
    if (!item) {
      throw new AppError({
        codigo: 'SP_NO_ENCONTRADO',
        mensaje: 'El servicio ya no existe en SharePoint.',
        estadoHttp: 404,
      });
    }
    if (etag && etag !== item.eTag) {
      throw new ConflictoError(undefined, { itemId, campos: Object.keys(campos) });
    }

    this.secuencia += 1;
    item.fields = { ...item.fields, ...campos };
    item.eTag = `"mock-${this.secuencia}"`;
    item.modificadoEn = new Date().toISOString();
    item.version = this.secuencia;
    return { eTag: item.eTag };
  }

  async ultimoNumeroSolicitud(): Promise<number> {
    const numeros = [...this.serviciosMock.values()].map((item) =>
      Number(item.fields.NumeroSolicitud ?? 0)
    );
    return Math.max(0, ...numeros.filter((numero) => Number.isFinite(numero)));
  }

  async contarPorNumeroSolicitud(numero: number): Promise<readonly { readonly itemId: string }[]> {
    return [...this.serviciosMock.values()]
      .filter((item) => Number(item.fields.NumeroSolicitud) === numero)
      .map((item) => ({ itemId: item.id }));
  }

  async renumerarServicio(
    itemId: string,
    numero: number,
    codigo: string
  ): Promise<ResultadoActualizacion> {
    return this.actualizarServicio(itemId, { NumeroSolicitud: numero, Title: codigo });
  }

  async listarAdjuntosDeServicio(servicioId: string): Promise<readonly ArchivoRemoto[]> {
    return [...this.archivosMock.values()]
      .filter((archivo) => archivo.fields.ServicioId === servicioId)
      .map((archivo) => ({
        id: archivo.id,
        name: archivo.name,
        eTag: archivo.eTag,
        webUrl: archivo.webUrl,
      }));
  }

  async eliminarArchivo(itemId: string): Promise<void> {
    this.archivosMock.delete(itemId);
  }

  async actualizarMetadatosArchivo(
    itemId: string,
    metadatos: Record<string, unknown>
  ): Promise<void> {
    const archivo = this.archivosMock.get(itemId);
    if (archivo) archivo.fields = { ...archivo.fields, ...metadatos };
  }

  async registrarLogSync(entrada: EntradaLogSync): Promise<void> {
    this.logs.push(entrada);
  }

  async cambiosServicios(deltaLink?: string): Promise<CambiosServicios> {
    const desde = deltaLink?.startsWith('mock-delta:') ? Number(deltaLink.slice(11)) : 0;
    const cambios = [...this.serviciosMock.values()]
      .filter((item) => item.version > desde)
      .map((item) => itemACambio(this.aItemLista(item)));
    return {
      cambios,
      deltaLink: `mock-delta:${this.secuencia}`,
      metodo: deltaLink ? 'delta' : 'completa',
    };
  }

  async leerServicioRemoto(servicioId: string): Promise<RemotoCambio | null> {
    const encontrado = [...this.serviciosMock.values()].find(
      (item) => item.fields.ServicioId === servicioId
    );
    return encontrado ? itemACambio(this.aItemLista(encontrado)) : null;
  }

  async listarArchivosServicio(): Promise<readonly ArchivoRemotoServicio[]> {
    return [];
  }

  async descargarMiniatura(): Promise<Blob | null> {
    return null;
  }

  /** Utilidades para el modo demo y las pruebas manuales. */
  registrarArchivo(id: string, ruta: string, campos: Record<string, unknown>): void {
    this.archivosMock.set(id, {
      id,
      name: ruta.split('/').at(-1) ?? id,
      eTag: '"mock-file"',
      webUrl: `https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV/${ruta}`,
      fields: campos,
    });
  }

  listarLogs(): readonly EntradaLogSync[] {
    return this.logs;
  }

  private aItemLista(item: ItemMock) {
    return {
      id: item.id,
      fields: item.fields,
      eTag: item.eTag,
      webUrl: item.webUrl,
      lastModifiedDateTime: item.modificadoEn,
    };
  }

  private aServicioRemoto(item: ItemMock): ServicioRemotoPush {
    return {
      id: item.id,
      fields: item.fields,
      eTag: item.eTag,
      webUrl: item.webUrl,
      modificadoEn: item.modificadoEn,
    };
  }
}

/**
 * Subida simulada para el modo demo. Mantiene el nombre determinista y el
 * progreso, pero no escribe en ningún backend.
 */
export function crearMockUploader(): Uploader {
  let secuencia = 0;
  return {
    async subir(archivo, ruta, opciones = {}): Promise<ItemSubido> {
      secuencia += 1;
      opciones.onProgreso?.(archivo.size, archivo.size);
      await opciones.onSesion?.(null);
      return {
        id: `mock-file-${secuencia}`,
        eTag: `"mock-file-${secuencia}"`,
        webUrl: `https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV/${ruta}`,
        nombre: ruta.split('/').at(-1) ?? `archivo-${secuencia}`,
      };
    },
  };
}
