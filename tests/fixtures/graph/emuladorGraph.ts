import { http, HttpResponse, type HttpHandler, type JsonBodyType } from 'msw';

import {
  LISTAS_DEMO,
  type ItemEmulado,
  type ListaEmulada,
  type OpcionesEmulador,
} from './emulador';

export type { ItemEmulado, ListaEmulada, OpcionesEmulador } from './emulador';

export interface FallaInyectable {
  readonly status: number;
  readonly headers?: Record<string, string>;
}

export interface OpcionesEmuladorGraph extends OpcionesEmulador {
  readonly listas?: readonly ListaEmulada[];
}

interface ItemEstado {
  readonly id: string;
  fields: Record<string, unknown>;
  eTag: string;
  readonly webUrl: string;
  modificadoEn: string;
  /** Secuencia del último cambio: el token del delta. */
  version: number;
  editor?: { readonly email: string; readonly nombre: string };
}

type ListaEstado = Omit<ListaEmulada, 'items'> & { items: ItemEstado[] };

interface ArchivoEstado {
  readonly id: string;
  readonly name: string;
  readonly ruta: string;
  eTag: string;
  readonly webUrl: string;
  tamano: number;
  contenido: Uint8Array;
  fields: Record<string, unknown>;
}

interface SesionEstado {
  readonly id: string;
  readonly ruta: string;
  recibido: number;
  partes: Uint8Array[];
  readonly expira: string;
}

export interface RangoSubida {
  readonly desde: number;
  readonly hasta: number;
  readonly total: number;
}

export interface PeticionEmulada {
  readonly metodo: string;
  readonly url: string;
  readonly cabeceras: Record<string, string>;
}

const LISTAS_POR_DEFECTO: readonly ListaEmulada[] = [
  ...LISTAS_DEMO,
  { id: 'l-log', name: 'LogSincronizacion', items: [] },
];

const json = (
  body: JsonBodyType,
  status = 200,
  headers?: Record<string, string>
): HttpResponse<JsonBodyType> =>
  headers === undefined
    ? HttpResponse.json(body, { status })
    : HttpResponse.json(body, { status, headers });

const errorGraph = (
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>
) => json({ error: { code, message } }, status, headers);

const nuevoEtag = (secuencia: number): string => `"etag-${secuencia}"`;

export const URL_MINIATURAS = 'https://miniaturas.sharepoint.test/thumb';

/** SharePoint real: en el `delta` el eTag llega SIN comillas (al leer el ítem llega con comillas). */
const sinComillas = (etag: string): string => etag.replace(/^"|"$/g, '');

const itemDelta = (item: ItemEstado): Record<string, unknown> => ({
  ...itemJson(item),
  eTag: sinComillas(item.eTag),
  '@odata.etag': sinComillas(item.eTag),
});

const itemJson = (item: ItemEstado): Record<string, unknown> => ({
  id: item.id,
  eTag: item.eTag,
  '@odata.etag': item.eTag,
  webUrl: item.webUrl,
  lastModifiedDateTime: item.modificadoEn,
  ...(item.editor
    ? { lastModifiedBy: { user: { email: item.editor.email, displayName: item.editor.nombre } } }
    : {}),
  fields: item.fields,
});

const archivoJson = (archivo: ArchivoEstado): Record<string, unknown> => ({
  id: archivo.id,
  name: archivo.name,
  size: archivo.tamano,
  eTag: archivo.eTag,
  '@odata.etag': archivo.eTag,
  webUrl: archivo.webUrl,
  lastModifiedDateTime: new Date().toISOString(),
  file: { mimeType: 'application/octet-stream' },
});

const concatenar = (partes: readonly Uint8Array[], total: number): Uint8Array => {
  const salida = new Uint8Array(total);
  let posicion = 0;
  for (const parte of partes) {
    salida.set(parte, posicion);
    posicion += parte.byteLength;
  }
  return salida;
};

const nombreDeRuta = (ruta: string): string => ruta.split('/').filter(Boolean).at(-1) ?? ruta;

const decodificarRuta = (ruta: string): string =>
  ruta
    .split('/')
    .filter(Boolean)
    .map((parte) => decodeURIComponent(parte))
    .join('/');

/**
 * Emulador en memoria de Graph para las pruebas de integración de la 005:
 * listas con `ServicioId` único, eTag por ítem, biblioteca con carpetas y
 * upload sessions reanudables. Incluye fallas inyectables.
 */
export class EmuladorGraph {
  private readonly baseUrl: string;
  private readonly host: string;
  private readonly siteId: string;
  private readonly sitePath: string;
  private readonly webUrl: string;
  private readonly driveId: string;
  private readonly tamanoPagina: number;
  private readonly listas: ListaEstado[];
  private readonly archivos = new Map<string, ArchivoEstado>();
  private readonly sesiones = new Map<string, SesionEstado>();
  private readonly eliminados: Array<{ readonly id: string; readonly version: number }> = [];
  private readonly fallas: FallaInyectable[] = [];
  private readonly peticiones: PeticionEmulada[] = [];
  private readonly rangos: RangoSubida[] = [];
  private secuencia = 0;
  private bytesHastaCorte: number | null = null;
  private bytesRecibidosCorte = 0;
  private forzarEtagMismatch = false;
  private carrera409 = false;
  private duplicadoComo409 = false;
  private desconectado = false;
  private conMiniaturas = true;
  miniaturasServidas = 0;

  constructor(opciones: OpcionesEmuladorGraph = {}) {
    this.baseUrl = opciones.baseUrl ?? 'https://graph.microsoft.com/v1.0';
    this.host = opciones.host ?? 'empresa.sharepoint.com';
    this.siteId = opciones.siteId ?? 'site-1';
    this.sitePath = opciones.sitePath ?? '/sites/ServicioTecnicoBC-DEV';
    this.webUrl = opciones.webUrl ?? `https://${this.host}${this.sitePath}`;
    this.driveId = opciones.driveId ?? 'drive-1';
    this.tamanoPagina = opciones.tamanoPagina ?? 500;
    this.listas = (opciones.listas ?? LISTAS_POR_DEFECTO).map((lista) => ({
      ...lista,
      items: (lista.items ?? []).map((item) => this.itemInicial(item)),
    }));
  }

  failNext(status: number, headers?: Record<string, string>): void {
    this.fallas.push(headers === undefined ? { status } : { status, headers });
  }

  fallarSiguientes(cantidad: number, status: number, headers?: Record<string, string>): void {
    for (let indice = 0; indice < cantidad; indice += 1) this.failNext(status, headers);
  }

  dropConnectionAfter(bytes: number): void {
    this.bytesHastaCorte = bytes;
    this.bytesRecibidosCorte = 0;
  }

  etagMismatch(): void {
    this.forzarEtagMismatch = true;
  }

  /** La siguiente búsqueda por ServicioId no lo encuentra, pero el POST sí detecta el duplicado. */
  simularCarrera409(): void {
    this.carrera409 = true;
  }

  /** Hace que un `ServicioId` duplicado responda 409 en vez del 400 que devuelve SharePoint real. */
  duplicadoDevuelve409(): void {
    this.duplicadoComo409 = true;
  }

  desconectar(): void {
    this.desconectado = true;
  }

  reconectar(): void {
    this.desconectado = false;
  }

  lista(nombre: string): ListaEstado | undefined {
    return this.listas.find((lista) => lista.name === nombre);
  }

  itemsDe(nombre: string): readonly ItemEstado[] {
    return this.lista(nombre)?.items ?? [];
  }

  logs(): readonly ItemEstado[] {
    return this.itemsDe('LogSincronizacion');
  }

  archivosEmulados(): readonly ArchivoEstado[] {
    return [...this.archivos.values()];
  }

  archivoPorRuta(ruta: string): ArchivoEstado | undefined {
    return this.archivos.get(ruta);
  }

  sembrarArchivo(ruta: string, contenido = new Uint8Array()): ArchivoEstado {
    return this.crearArchivo(ruta, contenido);
  }

  sembrarServicio(fields: Record<string, unknown>): ItemEstado {
    const lista = this.lista('Servicios');
    if (!lista) throw new Error('El emulador no tiene la lista Servicios.');
    return this.crearItem(lista, fields);
  }

  /** Simula que otra persona editó el ítem en SharePoint (cambia eTag y versión). */
  modificarRemoto(
    servicioId: string,
    fields: Record<string, unknown>,
    editor = { email: 'otra.persona@empresa.com', nombre: 'Otra Persona' }
  ): ItemEstado {
    const item = this.itemsDe('Servicios').find(
      (candidato) => candidato.fields.ServicioId === servicioId
    );
    if (!item) throw new Error(`El emulador no tiene el servicio ${servicioId}.`);
    this.secuencia += 1;
    item.fields = { ...item.fields, ...fields };
    item.eTag = nuevoEtag(this.secuencia);
    item.modificadoEn = new Date().toISOString();
    item.version = this.secuencia;
    item.editor = editor;
    return item;
  }

  /** Simula que se eliminó el ítem en SharePoint (el delta lo informa con `@removed`). */
  eliminarRemoto(servicioId: string): void {
    const lista = this.lista('Servicios');
    const item = lista?.items.find((candidato) => candidato.fields.ServicioId === servicioId);
    if (!lista || !item) throw new Error(`El emulador no tiene el servicio ${servicioId}.`);
    this.quitarItem(lista, item);
  }

  /** Los archivos del emulador dejan de tener miniatura. */
  sinMiniaturas(): void {
    this.conMiniaturas = false;
  }

  peticionesRealizadas(): readonly PeticionEmulada[] {
    return this.peticiones;
  }

  rangosDeSubida(): readonly RangoSubida[] {
    return this.rangos;
  }

  sesionesActivas(): number {
    return this.sesiones.size;
  }

  handlers(): HttpHandler[] {
    return [
      http.get(`${URL_MINIATURAS}/*`, () => {
        this.miniaturasServidas += 1;
        return new HttpResponse(new Uint8Array([1, 2, 3]), {
          headers: { 'content-type': 'image/jpeg' },
        });
      }),
      http.all(`${this.baseUrl}/*`, async ({ request }) => {
        this.peticiones.push({
          metodo: request.method,
          url: request.url,
          cabeceras: Object.fromEntries(request.headers.entries()),
        });
        if (this.desconectado) return HttpResponse.error();

        const fallo = this.fallas.shift();
        if (fallo) {
          return errorGraph(
            fallo.status,
            'falloEmulado',
            'Fallo inyectado por la prueba',
            fallo.headers
          );
        }

        return this.responder(request, new URL(request.url));
      }),
    ];
  }

  private itemInicial(item: ItemEmulado): ItemEstado {
    this.secuencia += 1;
    const eTag = nuevoEtag(this.secuencia);
    return {
      id: String(item.id),
      fields: { ...item.fields },
      eTag,
      webUrl: `${this.webUrl}/Lists/${item.id}/${item.id}`,
      modificadoEn: new Date().toISOString(),
      version: this.secuencia,
    };
  }

  private crearItem(lista: ListaEstado, fields: Record<string, unknown>): ItemEstado {
    this.secuencia += 1;
    const id = String(this.secuencia);
    const item: ItemEstado = {
      id,
      fields: { ...fields },
      eTag: nuevoEtag(this.secuencia),
      webUrl: `${this.webUrl}/Lists/${lista.name}/${id}`,
      modificadoEn: new Date().toISOString(),
      version: this.secuencia,
    };
    lista.items.push(item);
    return item;
  }

  private crearArchivo(ruta: string, contenido: Uint8Array): ArchivoEstado {
    const existente = this.archivos.get(ruta);
    this.secuencia += 1;
    const archivo: ArchivoEstado = {
      id: existente?.id ?? `file-${this.secuencia}`,
      name: nombreDeRuta(ruta),
      ruta,
      eTag: nuevoEtag(this.secuencia),
      webUrl: `${this.webUrl}/ServiciosAdjuntos/${encodeURIComponent(ruta)}`,
      tamano: contenido.byteLength,
      contenido,
      fields: existente?.fields ?? {},
    };
    this.archivos.set(ruta, archivo);
    return archivo;
  }

  private async responder(request: Request, url: URL): Promise<Response> {
    const ruta = this.rutaRelativa(url.pathname);

    if (ruta === `/sites/${this.host}:${this.sitePath}` || ruta === `/sites/${this.siteId}`) {
      return json({ id: this.siteId, webUrl: this.webUrl });
    }

    if (ruta.startsWith('/drives/')) return this.responderDrive(request, url, ruta);
    if (!ruta.startsWith('/sites/')) return errorGraph(404, 'notFound', 'Ruta desconocida');

    const partes = ruta.split('/').filter(Boolean);
    if (partes[0] !== 'sites' || partes[1] !== this.siteId || partes[2] !== 'lists') {
      return errorGraph(404, 'notFound', 'Sitio o lista desconocidos');
    }

    if (partes.length === 3) {
      return json({
        value: this.listas.map((lista) => ({
          id: lista.id,
          name: lista.name,
          displayName: lista.name,
        })),
      });
    }

    const idLista = partes[3];
    if (idLista === undefined) return errorGraph(404, 'notFound', 'Lista desconocida');

    const lista = this.listas.find((candidata) => candidata.id === idLista);
    if (!lista) return errorGraph(404, 'notFound', 'Lista desconocida');

    if (partes[4] === 'drive') return json({ id: this.driveId });
    if (partes[4] === 'columns') return json({ value: lista.columns ?? [] });
    if (partes[4] !== 'items') return errorGraph(404, 'notFound', 'Recurso no soportado');

    if (partes.length === 5) {
      if (request.method === 'GET') return this.listarItems(lista, url);
      if (request.method === 'POST') return this.crearDesdePeticion(lista, request);
      return errorGraph(405, 'methodNotAllowed', 'Método no soportado');
    }

    if (partes[5] === 'delta' && request.method === 'GET') return this.delta(lista, url);

    const idItem = partes[5];
    const item = lista.items.find((candidato) => candidato.id === idItem);
    if (!item) return errorGraph(404, 'notFound', 'Ítem no encontrado');

    if (partes[6] === 'fields' && request.method === 'PATCH') {
      return this.actualizarCampos(item, request);
    }
    if (request.method === 'GET') return json(itemJson(item));
    if (request.method === 'DELETE') {
      this.quitarItem(lista, item);
      return new HttpResponse(null, { status: 204 });
    }
    return errorGraph(405, 'methodNotAllowed', 'Método no soportado');
  }

  private quitarItem(lista: ListaEstado, item: ItemEstado): void {
    lista.items = lista.items.filter((candidato) => candidato.id !== item.id);
    this.secuencia += 1;
    if (lista.name === 'Servicios') this.eliminados.push({ id: item.id, version: this.secuencia });
  }

  /** Delta de la lista: cambios y eliminaciones posteriores al token (`?token=` es la versión). */
  private delta(lista: ListaEstado, url: URL): Response {
    const desdeVersion = Number(url.searchParams.get('token') ?? '0');
    const cambios: Record<string, unknown>[] = [
      ...lista.items.filter((item) => item.version > desdeVersion).map(itemDelta),
      ...this.eliminados
        .filter((eliminado) => eliminado.version > desdeVersion)
        // Forma real (comprobada en SharePoint): `deleted` y `fields` vacío; no existe `@removed`.
        .map((eliminado) => ({
          id: eliminado.id,
          parentReference: { siteId: 'sitio-de-pruebas' },
          deleted: { state: 'deleted' },
          fields: {},
        })),
    ];
    const salto = Number(url.searchParams.get('$skiptoken') ?? '0');
    const hasta = salto + this.tamanoPagina;
    const base = `${this.baseUrl}${this.rutaRelativa(url.pathname)}`;
    const pagina = cambios.slice(salto, hasta);

    if (hasta < cambios.length) {
      const parametros = new URLSearchParams(url.searchParams);
      parametros.set('$skiptoken', String(hasta));
      return json({ value: pagina, '@odata.nextLink': `${base}?${parametros.toString()}` });
    }
    return json({ value: pagina, '@odata.deltaLink': `${base}?token=${this.secuencia}` });
  }

  private listarItems(lista: ListaEstado, url: URL): Response {
    const filtro = url.searchParams.get('$filter') ?? '';
    const coincidencia = /fields\/ServicioId eq '((?:[^']|'')*)'/.exec(filtro);
    let items = lista.items;

    if (coincidencia?.[1] !== undefined) {
      const servicioId = coincidencia[1].replace(/''/g, "'");
      if (lista.name === 'Servicios' && this.carrera409) {
        this.carrera409 = false;
        items = [];
      } else {
        items = items.filter((item) => item.fields.ServicioId === servicioId);
      }
    }

    const desde = Number(url.searchParams.get('$skiptoken') ?? '0');
    const hasta = desde + this.tamanoPagina;
    const pagina = items.slice(desde, hasta);
    const siguiente =
      hasta < items.length
        ? `${this.baseUrl}${this.rutaRelativa(url.pathname)}?${(() => {
            const parametros = new URLSearchParams(url.searchParams);
            parametros.set('$skiptoken', String(hasta));
            return parametros.toString();
          })()}`
        : undefined;

    return json({
      value: pagina.map(itemJson),
      ...(siguiente ? { '@odata.nextLink': siguiente } : {}),
    });
  }

  private async crearDesdePeticion(
    lista: ListaEmulada & { items: ItemEstado[] },
    request: Request
  ): Promise<Response> {
    const cuerpo = (await request.json().catch(() => ({}))) as {
      fields?: Record<string, unknown>;
    };
    const fields = cuerpo.fields ?? {};

    if (lista.name === 'Servicios' && fields.ServicioId !== undefined) {
      const duplicado = lista.items.some((item) => item.fields.ServicioId === fields.ServicioId);
      if (duplicado) {
        // SharePoint real (probado en un tenant): 400 invalidRequest con este mensaje, no 409.
        if (this.duplicadoComo409) {
          return errorGraph(409, 'conflict', 'Ya existe un ítem con ese ServicioId');
        }
        return errorGraph(
          400,
          'invalidRequest',
          'One or more fields with unique constraints already has the provided value.'
        );
      }
    }

    const creado = this.crearItem(lista, fields);
    return json(itemJson(creado), 201);
  }

  private async actualizarCampos(item: ItemEstado, request: Request): Promise<Response> {
    if (this.forzarEtagMismatch) {
      this.forzarEtagMismatch = false;
      this.secuencia += 1;
      item.eTag = nuevoEtag(this.secuencia);
      item.modificadoEn = new Date().toISOString();
      item.version = this.secuencia;
      return errorGraph(412, 'preconditionFailed', 'El ítem cambió en SharePoint');
    }

    const ifMatch = request.headers.get('if-match');
    if (ifMatch !== null && ifMatch !== '*' && ifMatch !== item.eTag) {
      // SharePoint real: un eTag sin comillas (como el del delta) da 409 aunque esté vigente;
      // uno con comillas pero desactualizado da 412.
      if (!ifMatch.startsWith('"')) {
        return errorGraph(
          409,
          'resourceModified',
          'The resource has changed since the caller last read it'
        );
      }
      return errorGraph(
        412,
        'resourceModified',
        'The resource has changed since the caller last read it'
      );
    }

    const campos = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    this.secuencia += 1;
    item.fields = { ...item.fields, ...campos };
    item.eTag = nuevoEtag(this.secuencia);
    item.modificadoEn = new Date().toISOString();
    item.version = this.secuencia;
    return json({ ...item.fields, '@odata.etag': item.eTag, eTag: item.eTag });
  }

  private async responderDrive(request: Request, url: URL, ruta: string): Promise<Response> {
    if (!ruta.startsWith(`/drives/${this.driveId}/`)) {
      return errorGraph(404, 'notFound', 'Drive desconocido');
    }

    if (request.method === 'POST' && ruta.endsWith(':/createUploadSession')) {
      const rutaArchivo = this.rutaDeRoot(ruta, 'createUploadSession');
      if (rutaArchivo === undefined) return errorGraph(400, 'invalidRequest', 'Ruta inválida');
      this.secuencia += 1;
      const sesion: SesionEstado = {
        id: `sesion-${this.secuencia}`,
        ruta: rutaArchivo,
        recibido: 0,
        partes: [],
        expira: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
      this.sesiones.set(sesion.id, sesion);
      return json({
        uploadUrl: `${this.baseUrl}/drives/${this.driveId}/uploadSession/${sesion.id}`,
        expirationDateTime: sesion.expira,
      });
    }

    if (request.method === 'PUT' && ruta.endsWith(':/content')) {
      const rutaArchivo = this.rutaDeRoot(ruta, 'content');
      if (rutaArchivo === undefined) return errorGraph(400, 'invalidRequest', 'Ruta inválida');
      const contenido = new Uint8Array(await request.arrayBuffer());
      const archivo = this.crearArchivo(rutaArchivo, contenido);
      return json(archivoJson(archivo), 201);
    }

    if (request.method === 'PUT' && ruta.includes('/uploadSession/')) {
      return this.subirFragmento(request, ruta);
    }

    if (request.method === 'GET' && ruta.endsWith(':/children')) {
      const carpeta = this.rutaDeRoot(ruta, 'children');
      if (carpeta === undefined) return errorGraph(400, 'invalidRequest', 'Ruta inválida');
      const hijos = [...this.archivos.values()].filter((archivo) =>
        archivo.ruta.startsWith(`${carpeta}/`)
      );
      if (hijos.length === 0) return errorGraph(404, 'itemNotFound', 'La carpeta no existe');
      return json({ value: hijos.map(archivoJson) });
    }

    const idItem = /\/drives\/[^/]+\/items\/([^/]+)/.exec(ruta)?.[1];
    if (idItem === undefined) return errorGraph(404, 'notFound', 'Recurso de drive no soportado');
    const archivo = [...this.archivos.values()].find((candidato) => candidato.id === idItem);

    if (request.method === 'GET' && ruta.endsWith('/thumbnails')) {
      if (!archivo) return errorGraph(404, 'notFound', 'Archivo no encontrado');
      if (!this.conMiniaturas) return json({ value: [] });
      return json({ value: [{ small: { url: `${URL_MINIATURAS}/${archivo.id}` } }] });
    }

    if (request.method === 'DELETE') {
      if (!archivo) return errorGraph(404, 'notFound', 'Archivo no encontrado');
      this.archivos.delete(archivo.ruta);
      return new HttpResponse(null, { status: 204 });
    }

    if (request.method === 'GET') {
      if (!archivo) return errorGraph(404, 'notFound', 'Archivo no encontrado');
      return json(archivoJson(archivo));
    }

    if (request.method === 'PATCH' && ruta.endsWith('/listItem/fields')) {
      if (!archivo) return errorGraph(404, 'notFound', 'Archivo no encontrado');
      const campos = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      this.secuencia += 1;
      archivo.fields = { ...archivo.fields, ...campos };
      archivo.eTag = nuevoEtag(this.secuencia);
      return json({ ...archivo.fields, '@odata.etag': archivo.eTag });
    }

    void url;
    return errorGraph(405, 'methodNotAllowed', 'Método no soportado');
  }

  private async subirFragmento(request: Request, ruta: string): Promise<Response> {
    const idSesion = ruta.split('/uploadSession/')[1];
    const sesion = idSesion === undefined ? undefined : this.sesiones.get(idSesion);
    if (!sesion) {
      return errorGraph(404, 'itemNotFound', 'La sesión de subida expiró');
    }

    const rango = /bytes (\d+)-(\d+)\/(\d+)/.exec(request.headers.get('content-range') ?? '');
    if (!rango) return errorGraph(400, 'invalidRange', 'Content-Range inválido');
    const desde = Number(rango[1]);
    const hasta = Number(rango[2]);
    const total = Number(rango[3]);
    if (!Number.isFinite(desde) || !Number.isFinite(hasta) || !Number.isFinite(total)) {
      return errorGraph(400, 'invalidRange', 'Content-Range inválido');
    }
    if (desde !== sesion.recibido) {
      return errorGraph(416, 'invalidRange', 'Rango fuera de orden');
    }

    const cuerpo = new Uint8Array(await request.arrayBuffer());
    if (this.bytesHastaCorte !== null) {
      this.bytesRecibidosCorte += cuerpo.byteLength;
      if (this.bytesRecibidosCorte >= this.bytesHastaCorte) {
        this.bytesHastaCorte = null;
        this.bytesRecibidosCorte = 0;
        return HttpResponse.error();
      }
    }

    sesion.partes.push(cuerpo);
    sesion.recibido = hasta + 1;
    this.rangos.push({ desde, hasta, total });

    if (sesion.recibido < total) {
      return json({ nextExpectedRanges: [`${sesion.recibido}-${total - 1}`] }, 202);
    }

    const archivo = this.crearArchivo(sesion.ruta, concatenar(sesion.partes, sesion.recibido));
    this.sesiones.delete(sesion.id);
    return json(archivoJson(archivo), 200);
  }

  private rutaRelativa(pathname: string): string {
    const prefijo = new URL(this.baseUrl).pathname.replace(/\/$/, '');
    return pathname.startsWith(prefijo) ? pathname.slice(prefijo.length) : pathname;
  }

  private rutaDeRoot(
    ruta: string,
    sufijo: 'content' | 'createUploadSession' | 'children'
  ): string | undefined {
    const marca = '/root:';
    const indice = ruta.indexOf(marca);
    if (indice < 0) return undefined;
    const resto = ruta.slice(indice + marca.length);
    const cierre = resto.lastIndexOf(`:/${sufijo}`);
    if (cierre < 0) return undefined;
    return decodificarRuta(resto.slice(0, cierre));
  }
}

export default EmuladorGraph;
