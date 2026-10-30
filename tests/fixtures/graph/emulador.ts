import { http, HttpResponse, type HttpHandler } from 'msw';

export interface ItemEmulado {
  readonly id: string;
  readonly fields: Record<string, unknown>;
}

export interface ListaEmulada {
  readonly id: string;
  readonly name: string;
  readonly columns?: ReadonlyArray<{
    readonly name: string;
    readonly choice?: { readonly choices: readonly string[] };
  }>;
  readonly items?: readonly ItemEmulado[];
}

export interface OpcionesEmulador {
  readonly baseUrl?: string;
  readonly host?: string;
  readonly siteId?: string;
  readonly sitePath?: string;
  readonly webUrl?: string;
  readonly driveId?: string;
  readonly listas?: readonly ListaEmulada[];
  readonly tamanoPagina?: number;
}

export interface RespuestaEmulada {
  readonly status: number;
  readonly body: unknown;
}

const HOST_POR_DEFECTO = 'contoso.sharepoint.com';
const SITE_PATH_POR_DEFECTO = '/sites/ServicioTecnicoBC-DEV';

export const LISTAS_DEMO: readonly ListaEmulada[] = [
  {
    id: 'l-servicios',
    name: 'Servicios',
    columns: [
      { name: 'Diagnostico', choice: { choices: ['D. FINAL', 'REPARAR', 'NO REPARABLE'] } },
      {
        name: 'Estado',
        choice: {
          choices: ['RECIBIDO', 'DIAGNOSTICADO', 'COTIZADO', 'EN_REPARACION', 'ENTREGADO'],
        },
      },
      { name: 'CotizacionEstado', choice: { choices: ['PENDIENTE', 'APROBADA', 'RECHAZADA'] } },
      { name: 'TipoEquipo', choice: { choices: ['BATERIA', 'CARGADOR'] } },
    ],
  },
  {
    id: 'l-clientes',
    name: 'Clientes',
    items: [
      { id: '1', fields: { ID: 1, Title: 'Clientes Demo SAS', Activo: true } },
      { id: '2', fields: { ID: 2, Title: 'Transportes Andinos', Activo: true } },
      { id: '3', fields: { ID: 3, Title: 'Cliente Inactivo', Activo: false } },
    ],
  },
  {
    id: 'l-marcas',
    name: 'Marcas',
    items: [
      { id: '1', fields: { Title: 'ROQUET', Activo: true } },
      { id: '2', fields: { Title: 'TROJAN', Activo: true } },
      { id: '3', fields: { Title: 'BOSCH', Activo: true } },
    ],
  },
  {
    id: 'l-configuracion',
    name: 'ConfiguracionApp',
    items: [
      { id: '1', fields: { Title: 'MaxFotosIngreso', Valor: '5' } },
      { id: '2', fields: { Title: 'MaxFotosEtapa', Valor: '5' } },
      { id: '3', fields: { Title: 'DiasAlertaVidaUtil', Valor: '30' } },
      { id: '4', fields: { Title: 'VersionMinimaApp', Valor: '1.0.0' } },
    ],
  },
  {
    id: 'l-adjuntos',
    name: 'ServiciosAdjuntos',
    columns: [
      {
        name: 'TipoAdjunto',
        choice: { choices: ['Foto ingreso', 'Factura', 'Evidencia', 'PDF'] },
      },
    ],
  },
];

/**
 * Emulador en memoria de las lecturas de SharePoint usadas por la 004.
 * La 005 lo amplia con escrituras y delta.
 */
export class EmuladorGraph {
  private readonly baseUrl: string;
  private readonly host: string;
  private readonly siteId: string;
  private readonly sitePath: string;
  private readonly webUrl: string;
  private readonly driveId: string;
  private readonly tamanoPagina: number;
  private readonly listas: ListaEmulada[];
  private fallos: number[] = [];
  private desconectado = false;

  constructor(opciones: OpcionesEmulador = {}) {
    this.baseUrl = opciones.baseUrl ?? 'https://graph.microsoft.com/v1.0';
    this.host = opciones.host ?? 'empresa.sharepoint.com';
    this.siteId = opciones.siteId ?? 'site-1';
    this.sitePath = opciones.sitePath ?? '/sites/ServicioTecnicoBC-DEV';
    this.webUrl = opciones.webUrl ?? `https://${this.host}${this.sitePath}`;
    this.driveId = opciones.driveId ?? 'drive-1';
    this.tamanoPagina = opciones.tamanoPagina ?? 100;
    this.listas = (opciones.listas ?? LISTAS_DEMO).map((lista) => ({
      ...lista,
      ...(lista.items ? { items: [...lista.items] } : {}),
    }));
  }

  failNext(status: number): void {
    this.fallos.push(status);
  }

  desconectar(): void {
    this.desconectado = true;
  }

  reconectar(): void {
    this.desconectado = false;
  }

  lista(nombre: string): ListaEmulada | undefined {
    return this.listas.find((lista) => lista.name === nombre);
  }

  /**
   * Resuelve una peticion de Graph sin MSW. Lo usa el E2E de Playwright, que
   * intercepta con `page.route` y necesita una respuesta sincrona.
   */
  manejar(url: string, metodo = 'GET', _cuerpo?: unknown): RespuestaEmulada {
    if (this.desconectado) {
      return { status: 503, body: { error: { code: 'sinConexion', message: 'desconectado' } } };
    }
    const fallo = this.fallos.shift();
    if (fallo !== undefined) {
      return { status: fallo, body: { error: { code: 'emulado', message: 'fallo' } } };
    }
    if (metodo !== 'GET') {
      return { status: 204, body: null };
    }

    const prefijo = new URL(this.baseUrl).pathname.replace(/\/$/, '');
    const direccion = new URL(url);
    if (!direccion.pathname.startsWith(`${prefijo}/sites/`)) {
      return { status: 404, body: { error: { code: 'notFound' } } };
    }

    const resto = direccion.pathname.slice(`${prefijo}/sites/`.length);
    if (resto === `${this.host}:${this.sitePath}`) {
      return { status: 200, body: { id: this.siteId, webUrl: this.webUrl } };
    }
    if (resto === `${this.siteId}/lists`) {
      return {
        status: 200,
        body: {
          value: this.listas.map((lista) => ({
            id: lista.id,
            name: lista.name,
            displayName: lista.name,
          })),
        },
      };
    }

    const partes = resto.split('/').map((parte) => decodeURIComponent(parte));
    if (partes[0] !== this.siteId || partes[1] !== 'lists') {
      return { status: 404, body: { error: { code: 'notFound' } } };
    }

    const lista = this.listas.find((candidata) => candidata.id === partes[2]);
    if (!lista) {
      return { status: 404, body: { error: { code: 'notFound' } } };
    }

    if (partes[3] === 'drive') {
      return { status: 200, body: { id: this.driveId } };
    }
    if (partes[3] === 'columns') {
      return { status: 200, body: { value: lista.columns ?? [] } };
    }
    if (partes[3] !== 'items') {
      return { status: 404, body: { error: { code: 'notFound' } } };
    }

    const items = lista.items ?? [];
    const desde = Number(direccion.searchParams.get('$skiptoken') ?? '0');
    const hasta = desde + this.tamanoPagina;
    const pagina = items.slice(desde, hasta);
    const siguiente =
      hasta < items.length
        ? `${this.baseUrl}/sites/${this.siteId}/lists/${lista.id}/items?$skiptoken=${hasta}`
        : undefined;

    return {
      status: 200,
      body: {
        value: pagina,
        ...(siguiente ? { '@odata.nextLink': siguiente } : {}),
      },
    };
  }

  handlers(): HttpHandler[] {
    return [
      http.get(`${this.baseUrl}/sites/*`, ({ request }) => {
        if (this.desconectado) return HttpResponse.error();
        const respuesta = this.manejar(request.url, request.method);
        return HttpResponse.json(respuesta.body, { status: respuesta.status });
      }),
    ];
  }
}

/**
 * Fabrica para los E2E: por defecto apunta al sitio configurado en
 * `.env.development`, porque el navegador resuelve `VITE_SHAREPOINT_SITE_URL`.
 */
export function crearEmuladorGraph(opciones: OpcionesEmulador = {}): EmuladorGraph {
  return new EmuladorGraph({
    host: HOST_POR_DEFECTO,
    sitePath: SITE_PATH_POR_DEFECTO,
    webUrl: `https://${HOST_POR_DEFECTO}${SITE_PATH_POR_DEFECTO}`,
    ...opciones,
  });
}
