import type {
  Catalogos,
  RemoteGateway,
  SitioResuelto,
} from '@/application/ports/remoteGateway';

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

/**
 * Graph simulado en el navegador cuando VITE_AUTH_MODE=mock.
 * Permite recorrer el asistente y la app en DEV sin tenant (SDD 8.6).
 * En pruebas de integracion se usa el emulador de MSW, no este adaptador.
 */
export class MockRemoteGateway implements RemoteGateway {
  async resolverSitio(): Promise<SitioResuelto> {
    return {
      siteId: 'mock-site',
      webUrl: 'https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV',
      listas: {
        Servicios: 'mock-servicios',
        Clientes: 'mock-clientes',
        Marcas: 'mock-marcas',
        ConfiguracionApp: 'mock-configuracion',
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
}
