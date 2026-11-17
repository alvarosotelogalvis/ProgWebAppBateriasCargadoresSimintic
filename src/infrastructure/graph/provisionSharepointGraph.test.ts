// @vitest-environment node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CONFIG_DEFECTO, combinarConfig } from '@/domain/config';

import {
  VALOR_COTIZACION_ESTADO,
  VALOR_ESTADO,
  VALOR_TIPO_ADJUNTO,
  VALOR_TIPO_EQUIPO,
} from './mappers/choices';
import { CAMPO_SP, COLUMNAS_SOLO_POWER_AUTOMATE } from './mappers/servicioMapper';

/**
 * `scripts/provision-sharepoint-graph.mjs` crea en SharePoint lo que esta app espera encontrar. Estas pruebas
 * verifican (1) que su esquema coincide con el código de la app y (2) su comportamiento con un Graph simulado:
 * ensayo sin escribir, creación, idempotencia, y que nunca pisa ni borra nada.
 */
interface Campo {
  n: string;
  d?: string;
  t: string;
  opciones?: string[];
  defecto?: unknown;
  unico?: boolean;
  indice?: boolean;
  lista?: string;
  max?: number;
  obligatorio?: boolean;
}
interface Graph {
  get(ruta: string): Promise<unknown>;
  post(ruta: string, cuerpo: unknown): Promise<Record<string, unknown>>;
  patch(ruta: string, cuerpo: unknown): Promise<Record<string, unknown>>;
  getTodos(ruta: string): Promise<Record<string, unknown>[]>;
}
interface Resumen {
  creados: number;
  existentes: number;
  corregidos: number;
  avisos: string[];
}
interface Modulo {
  columnaGraph(campo: Campo, ids?: Record<string, string>): Record<string, unknown>;
  aprovisionar(o: {
    graph: Graph;
    siteId: string;
    aplicar?: boolean;
    sinDatos?: boolean;
    correos?: { ot?: string; alertas?: string };
    anios?: number[];
    log?: (t: string) => void;
  }): Promise<Resumen>;
  verificar(o: { graph: Graph; siteId: string }): Promise<string[]>;
  crearGraph(o: {
    obtenerToken: () => Promise<string>;
    fetchFn: typeof fetch;
    base?: string;
    esperar?: (ms: number) => Promise<void>;
  }): Graph;
  obtenerTokenAplicacion(o: {
    tenant: string;
    clientId: string;
    secreto: string;
    fetchFn: typeof fetch;
  }): Promise<string>;
  leerArgumentos(argv: string[]): Record<string, unknown>;
  partesDelSitio(site: string): { host: string; ruta: string };
}
interface Esquema {
  CAMPOS: Record<string, Campo[]>;
  LISTAS: { nombre: string; plantilla: string }[];
  ESTADOS_SERVICIO: string[];
  CONFIGURACION_POR_DEFECTO: Record<string, [string, string]>;
  CLIENTES_INICIALES: string[];
  MARCAS_INICIALES: string[];
}

let m: Modulo;
let esquema: Esquema;

beforeAll(async () => {
  const cargar = (archivo: string) =>
    import(/* @vite-ignore */ pathToFileURL(resolve(process.cwd(), 'scripts', archivo)).href);
  m = (await cargar('provision-sharepoint-graph.mjs')) as Modulo;
  esquema = (await cargar('esquema-sharepoint.mjs')) as Esquema;
});

const ordenados = (v: readonly string[]): string[] => [...v].sort();
const sinLog = (): void => undefined;

// ----------------------------------------------------------------------------------------------------
// Graph simulado en memoria
// ----------------------------------------------------------------------------------------------------
class GraphSimulado implements Graph {
  listas = new Map<
    string,
    {
      id: string;
      name: string;
      template: string;
      columnas: Map<string, Record<string, unknown>>;
      items: Record<string, unknown>[];
    }
  >();
  escrituras = 0;
  /** Carpetas de la raíz de la biblioteca de adjuntos. */
  carpetas = new Set<string>();
  private contador = 0;

  private porId(id: string) {
    const lista = [...this.listas.values()].find((l) => l.id === id);
    if (!lista) throw new Error(`lista inexistente ${id}`);
    return lista;
  }

  async get(ruta: string): Promise<unknown> {
    if (/\/lists\/[^/]+\/drive\?/.test(ruta)) return { id: 'unidad-1' };
    return {};
  }

  async getTodos(ruta: string): Promise<Record<string, unknown>[]> {
    if (/\/lists\?/.test(ruta)) {
      return [...this.listas.values()].map((l) => ({
        id: l.id,
        name: l.name,
        displayName: l.name,
        list: { template: l.template },
      }));
    }
    const columnas = /\/lists\/([^/]+)\/columns/.exec(ruta);
    if (columnas) {
      return [...this.porId(columnas[1]!).columnas.values()].map((c) => ({
        ...c,
        id: c.id ?? c.name,
      }));
    }
    if (/\/drives\/unidad-1\/root\/children/.test(ruta)) {
      return [...this.carpetas].map((name) => ({ name, folder: {} }));
    }
    const items = /\/lists\/([^/]+)\/items/.exec(ruta);
    if (items) return this.porId(items[1]!).items;
    throw new Error(`GET no simulado: ${ruta}`);
  }

  async post(ruta: string, cuerpo: unknown): Promise<Record<string, unknown>> {
    this.escrituras++;
    const c = cuerpo as Record<string, unknown>;
    if (/\/lists$/.test(ruta)) {
      const nombre = c.displayName as string;
      if (this.listas.has(nombre)) throw new Error(`lista duplicada ${nombre}`);
      const lista = {
        id: `id-${++this.contador}`,
        name: nombre,
        template: (c.list as { template: string }).template,
        columnas: new Map<string, Record<string, unknown>>([['Title', { name: 'Title' }]]),
        items: [] as Record<string, unknown>[],
      };
      for (const columna of c.columns as Record<string, unknown>[]) {
        this.validarColumna(columna);
        lista.columnas.set(columna.name as string, columna);
      }
      this.listas.set(nombre, lista);
      return { id: lista.id, name: nombre };
    }
    if (/\/drives\/unidad-1\/root\/children$/.test(ruta)) {
      this.carpetas.add(c.name as string);
      return {};
    }
    const columnas = /\/lists\/([^/]+)\/columns$/.exec(ruta);
    if (columnas) {
      this.validarColumna(c);
      this.porId(columnas[1]!).columnas.set(c.name as string, c);
      return {};
    }
    const items = /\/lists\/([^/]+)\/items$/.exec(ruta);
    if (items) {
      this.porId(items[1]!).items.push(c);
      return { id: String(++this.contador) };
    }
    throw new Error(`POST no simulado: ${ruta}`);
  }

  async patch(ruta: string, cuerpo: unknown): Promise<Record<string, unknown>> {
    this.escrituras++;
    const columna = /\/lists\/([^/]+)\/columns\/([^/?]+)$/.exec(ruta);
    if (!columna) throw new Error(`PATCH no simulado: ${ruta}`);
    const lista = this.porId(columna[1]!);
    const actual = [...lista.columnas.values()].find((c) => (c.id ?? c.name) === columna[2]);
    if (!actual) throw new Error(`columna inexistente ${columna[2]}`);
    Object.assign(actual, cuerpo as Record<string, unknown>);
    return {};
  }

  /** Una búsqueda debe apuntar a una lista que ya exista, como exige Graph. */
  private validarColumna(columna: Record<string, unknown>): void {
    const lookup = columna.lookup as { listId: string } | undefined;
    if (lookup && ![...this.listas.values()].some((l) => l.id === lookup.listId)) {
      throw new Error(`búsqueda a una lista inexistente: ${lookup.listId}`);
    }
  }
}

const NOMBRES_LISTAS = [
  'Clientes',
  'Marcas',
  'Servicios',
  'ConfiguracionApp',
  'LogSincronizacion',
  'ServiciosAdjuntos',
];

describe('esquema de SharePoint frente a la app', () => {
  const nombres = (lista: string): string[] => esquema.CAMPOS[lista]!.map((c) => c.n);
  const delMapeador = Object.values(CAMPO_SP).map((c) => (c === 'ClienteLookupId' ? 'Cliente' : c));
  const captura = [
    'ServicioId',
    'CapturadoPor',
    'CapturadoPorNombre',
    'CapturadoEn',
    'ActualizadoEnDispositivo',
    'DispositivoId',
    'AppVersion',
    'UrlCarpetaAdjuntos',
  ];

  it('define las seis listas y bibliotecas que la app busca por nombre, Clientes antes que Servicios', () => {
    expect(ordenados(esquema.LISTAS.map((l) => l.nombre))).toEqual(ordenados(NOMBRES_LISTAS));
    const orden = esquema.LISTAS.map((l) => l.nombre);
    expect(orden.indexOf('Clientes')).toBeLessThan(orden.indexOf('Servicios'));
    expect(esquema.LISTAS.find((l) => l.nombre === 'ServiciosAdjuntos')?.plantilla).toBe(
      'documentLibrary'
    );
  });

  it('Servicios tiene todas las columnas del mapeador, las de captura y las de Power Automate, y ninguna de sobra', () => {
    const esperadas = new Set<string>([
      ...delMapeador,
      ...captura,
      ...COLUMNAS_SOLO_POWER_AUTOMATE,
    ]);
    expect(ordenados(nombres('Servicios'))).toEqual(ordenados([...esperadas]));
  });

  it('las columnas de la bitácora y de la biblioteca son las que la app escribe', () => {
    expect(ordenados(nombres('LogSincronizacion'))).toEqual(
      ordenados([
        'Usuario',
        'Dispositivo',
        'AppVersion',
        'Inicio',
        'Fin',
        'Resultado',
        'ServiciosSubidos',
        'ArchivosSubidos',
        'ServiciosDescargados',
        'Conflictos',
        'Errores',
      ])
    );
    expect(ordenados(nombres('ServiciosAdjuntos'))).toEqual(
      ordenados(['ServicioId', 'AdjuntoId', 'TipoAdjunto', 'FechaCaptura', 'CapturadoPor'])
    );
  });

  it('los valores de los Choice son exactamente los que la app traduce', () => {
    const opciones = (lista: string, campo: string): string[] =>
      esquema.CAMPOS[lista]!.find((c) => c.n === campo)!.opciones!;
    expect(ordenados(opciones('Servicios', 'Estado'))).toEqual(
      ordenados(Object.values(VALOR_ESTADO))
    );
    expect(ordenados(opciones('Servicios', 'TipoEquipo'))).toEqual(
      ordenados(Object.values(VALOR_TIPO_EQUIPO))
    );
    expect(ordenados(opciones('Servicios', 'CotizacionEstado'))).toEqual(
      ordenados(Object.values(VALOR_COTIZACION_ESTADO))
    );
    expect(ordenados(opciones('ServiciosAdjuntos', 'TipoAdjunto'))).toEqual(
      ordenados(Object.values(VALOR_TIPO_ADJUNTO))
    );
    expect(opciones('Servicios', 'Diagnostico')).toContain(
      CONFIG_DEFECTO.diagnosticoValorDisposicionFinal
    );
  });

  it('ServicioId es obligatorio, único e indexado (la idempotencia de la sincronización depende de ello)', () => {
    const servicioId = esquema.CAMPOS.Servicios!.find((c) => c.n === 'ServicioId')!;
    expect(servicioId).toMatchObject({ obligatorio: true, unico: true });
    const indexadas = esquema.CAMPOS.Servicios!.filter((c) => c.indice).map((c) => c.n);
    expect(ordenados(indexadas)).toEqual(
      ordenados(['Estado', 'NumeroSolicitud', 'SerieEquipo', 'ProyeccionVidaUtil'])
    );
  });

  it('NumeroSolicitud está indexada (para leer el mayor) pero no se pide única: SharePoint no la garantiza (spike S9)', () => {
    const numero = esquema.CAMPOS.Servicios!.find((c) => c.n === 'NumeroSolicitud')!;
    expect(numero).toMatchObject({ t: 'numero', indice: true });
    expect(numero.unico).not.toBe(true);
  });

  it('las claves de configuración por defecto son válidas para la app y producen su configuración por defecto', () => {
    const claves = Object.fromEntries(
      Object.entries(esquema.CONFIGURACION_POR_DEFECTO).map(([k, [valor]]) => [k, valor])
    );
    const avisos: string[] = [];
    const config = combinarConfig(claves, CONFIG_DEFECTO, { warn: (e) => avisos.push(e) });
    expect(avisos).toEqual([]);
    expect(config).toEqual(CONFIG_DEFECTO);
    expect(Object.keys(claves)).not.toContain('CorreoDestinoOT'); // los correos dependen del cliente
  });
});

describe('columnaGraph (formato validado contra un tenant real)', () => {
  it.each([
    [
      'texto',
      { n: 'Marca', d: 'Marca', t: 'texto', max: 60 },
      { text: { maxLength: 60, allowMultipleLines: false } },
    ],
    [
      'nota',
      { n: 'Obs', d: 'Obs', t: 'nota' },
      { text: { allowMultipleLines: true, textType: 'plain', linesForEditing: 6 } },
    ],
    [
      'solo fecha',
      { n: 'F', d: 'F', t: 'fecha' },
      { dateTime: { displayAs: 'default', format: 'dateOnly' } },
    ],
    [
      'fecha y hora',
      { n: 'F', d: 'F', t: 'fechaHora' },
      { dateTime: { displayAs: 'default', format: 'dateTime' } },
    ],
    [
      'número',
      { n: 'N', d: 'N', t: 'numero' },
      { number: { decimalPlaces: 'none', displayAs: 'number' } },
    ],
    ['moneda', { n: 'V', d: 'V', t: 'moneda' }, { currency: { locale: 'es-CO' } }],
  ])('%s', (_nombre, campo, esperado) => {
    expect(m.columnaGraph(campo as Campo)).toMatchObject(esperado);
  });

  it('Sí/No con valor por defecto: «1» y «0»', () => {
    expect(m.columnaGraph({ n: 'A', d: 'A', t: 'si_no', defecto: true })).toMatchObject({
      boolean: {},
      defaultValue: { value: '1' },
    });
    expect(m.columnaGraph({ n: 'A', d: 'A', t: 'si_no', defecto: false })).toMatchObject({
      defaultValue: { value: '0' },
    });
  });

  it('Choice sin texto libre y con valor por defecto', () => {
    expect(
      m.columnaGraph({
        n: 'E',
        d: 'E',
        t: 'eleccion',
        opciones: ['Ninguna', '90'],
        defecto: 'Ninguna',
      })
    ).toMatchObject({
      choice: { allowTextEntry: false, choices: ['Ninguna', '90'], displayAs: 'dropDownMenu' },
      defaultValue: { value: 'Ninguna' },
    });
  });

  it('una columna única también queda indexada y obligatoria si se pide', () => {
    expect(
      m.columnaGraph({
        n: 'ServicioId',
        d: 'ServicioId',
        t: 'texto',
        obligatorio: true,
        unico: true,
      })
    ).toMatchObject({
      required: true,
      indexed: true,
      enforceUniqueValues: true,
    });
  });

  it('la búsqueda exige el id de la lista destino', () => {
    const cliente = {
      n: 'Cliente',
      d: 'Cliente',
      t: 'busqueda',
      lista: 'Clientes',
      campo: 'Title',
    };
    expect(() => m.columnaGraph(cliente as Campo)).toThrow(/Clientes/);
    expect(m.columnaGraph(cliente as Campo, { Clientes: 'abc' })).toMatchObject({
      lookup: { listId: 'abc', columnName: 'Title', allowMultipleValues: false },
    });
  });
});

describe('aprovisionar', () => {
  it('en ensayo (sin aplicar) no escribe nada', async () => {
    const graph = new GraphSimulado();

    const resumen = await m.aprovisionar({ graph, siteId: 'S', aplicar: false, log: sinLog });

    expect(graph.escrituras).toBe(0);
    expect(graph.listas.size).toBe(0);
    expect(resumen.creados).toBe(0);
  });

  it('al aplicar crea las 6 listas con sus columnas, la búsqueda a Clientes y los datos iniciales', async () => {
    const graph = new GraphSimulado();

    await m.aprovisionar({
      graph,
      siteId: 'S',
      aplicar: true,
      log: sinLog,
      correos: { ot: 'ot@empresa.com', alertas: 'a@empresa.com' },
    });

    expect(ordenados([...graph.listas.keys()])).toEqual(ordenados(NOMBRES_LISTAS));
    expect(graph.listas.get('ServiciosAdjuntos')?.template).toBe('documentLibrary');
    const servicios = graph.listas.get('Servicios')!;
    expect(servicios.columnas.size).toBe(esquema.CAMPOS.Servicios!.length + 1); // + Title
    expect(servicios.columnas.get('Cliente')).toMatchObject({
      lookup: { listId: graph.listas.get('Clientes')!.id },
    });
    expect(servicios.columnas.get('ServicioId')).toMatchObject({
      enforceUniqueValues: true,
      indexed: true,
      required: true,
    });
    expect(
      graph.listas.get('Clientes')!.items.map((i) => (i.fields as { Title: string }).Title)
    ).toEqual(esquema.CLIENTES_INICIALES);
    expect(graph.listas.get('Marcas')!.items).toHaveLength(esquema.MARCAS_INICIALES.length);
    const claves = graph.listas
      .get('ConfiguracionApp')!
      .items.map((i) => (i.fields as { Title: string }).Title);
    expect(claves).toHaveLength(Object.keys(esquema.CONFIGURACION_POR_DEFECTO).length + 2);
    expect(claves).toContain('CorreoDestinoOT');
  });

  it('es idempotente: una segunda ejecución no escribe nada', async () => {
    const graph = new GraphSimulado();
    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });
    graph.escrituras = 0;

    const segunda = await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });

    expect(graph.escrituras).toBe(0);
    expect(segunda.creados).toBe(0);
    expect(segunda.existentes).toBeGreaterThan(0);
  });

  it('completa un sitio que ya tenía la lista pero le faltan columnas, sin tocar las demás', async () => {
    const graph = new GraphSimulado();
    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });
    const servicios = graph.listas.get('Servicios')!;
    servicios.columnas.delete('FacturaNumero');
    graph.escrituras = 0;

    const resumen = await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });

    expect(graph.escrituras).toBe(1);
    expect(resumen.creados).toBe(1);
    expect(servicios.columnas.has('FacturaNumero')).toBe(true);
  });

  it('corrige una columna existente que no es única ni está indexada (spike S9)', async () => {
    const graph = new GraphSimulado();
    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });
    const columna = graph.listas.get('Servicios')!.columnas.get('ServicioId')!;
    Object.assign(columna, { indexed: false, enforceUniqueValues: false });
    graph.escrituras = 0;

    const resumen = await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });

    expect(columna).toMatchObject({ indexed: true, enforceUniqueValues: true });
    expect(resumen.corregidos).toBe(1);
    expect(graph.escrituras).toBe(1);
  });

  it('el ensayo avisa de la columna por corregir pero no la toca', async () => {
    const graph = new GraphSimulado();
    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });
    const columna = graph.listas.get('Servicios')!.columnas.get('ServicioId')!;
    Object.assign(columna, { indexed: false, enforceUniqueValues: false });
    graph.escrituras = 0;
    const lineas: string[] = [];

    const resumen = await m.aprovisionar({
      graph,
      siteId: 'S',
      aplicar: false,
      log: (t) => lineas.push(t),
    });

    expect(graph.escrituras).toBe(0);
    expect(resumen.corregidos).toBe(0);
    expect(columna).toMatchObject({ indexed: false, enforceUniqueValues: false });
    expect(lineas.join('\n')).toContain('Servicios.ServicioId');
  });

  it('indexa NumeroSolicitud si existía sin índice, sin pedirle valor único', async () => {
    const graph = new GraphSimulado();
    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });
    const columna = graph.listas.get('Servicios')!.columnas.get('NumeroSolicitud')!;
    Object.assign(columna, { indexed: false, enforceUniqueValues: false });

    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });

    expect(columna).toMatchObject({ indexed: true });
    expect(columna.enforceUniqueValues).not.toBe(true);
  });

  it('nunca pisa una clave de configuración que ya existe', async () => {
    const graph = new GraphSimulado();
    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });
    const maxFotos = graph.listas
      .get('ConfiguracionApp')!
      .items.find((i) => (i.fields as { Title: string }).Title === 'MaxFotosIngreso')!;
    (maxFotos.fields as { Valor: string }).Valor = '8';

    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });

    expect((maxFotos.fields as { Valor: string }).Valor).toBe('8');
    expect(
      graph.listas
        .get('ConfiguracionApp')!
        .items.filter((i) => (i.fields as { Title: string }).Title === 'MaxFotosIngreso')
    ).toHaveLength(1);
  });

  it('sin correos no crea las claves CorreoDestino* (la app las rechaza vacías) y avisa', async () => {
    const graph = new GraphSimulado();

    const resumen = await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });

    const claves = graph.listas
      .get('ConfiguracionApp')!
      .items.map((i) => (i.fields as { Title: string }).Title);
    expect(claves.some((c) => c.startsWith('CorreoDestino'))).toBe(false);
    expect(resumen.avisos.join(' ')).toMatch(/CorreoDestinoOT/);
  });

  it('con sinDatos no carga clientes, marcas ni configuración', async () => {
    const graph = new GraphSimulado();

    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, sinDatos: true, log: sinLog });

    expect(graph.listas.get('Clientes')!.items).toHaveLength(0);
    expect(graph.listas.get('ConfiguracionApp')!.items).toHaveLength(0);
  });

  it('crea la carpeta de cada año en la biblioteca de adjuntos, sin crear la de cada servicio', async () => {
    const graph = new GraphSimulado();

    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, anios: [2026, 2027], log: sinLog });

    expect([...graph.carpetas].sort()).toEqual(['2026', '2027']);
  });

  it('las carpetas de año son idempotentes y el ensayo no las crea', async () => {
    const graph = new GraphSimulado();
    await m.aprovisionar({ graph, siteId: 'S', aplicar: false, anios: [2026], log: sinLog });
    expect(graph.carpetas.size).toBe(0);

    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, anios: [2026], log: sinLog });
    graph.escrituras = 0;
    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, anios: [2026], log: sinLog });

    expect(graph.escrituras).toBe(0);
    expect(graph.carpetas.size).toBe(1);
  });

  it('avisa de lo que Graph no puede configurar (versionado, vistas, permisos)', async () => {
    const resumen = await m.aprovisionar({
      graph: new GraphSimulado(),
      siteId: 'S',
      aplicar: false,
      log: sinLog,
    });

    expect(resumen.avisos.join(' ')).toMatch(/versionado.*vistas.*permisos/i);
  });
});

describe('verificar', () => {
  it('no encuentra problemas tras aprovisionar', async () => {
    const graph = new GraphSimulado();
    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });
    // El simulado devuelve las columnas tal como se enviaron (con las propiedades que Graph conserva).
    expect(await m.verificar({ graph, siteId: 'S' })).toEqual([]);
  });

  it('detecta una columna faltante, una lista faltante y un ServicioId que dejó de ser único', async () => {
    const graph = new GraphSimulado();
    await m.aprovisionar({ graph, siteId: 'S', aplicar: true, log: sinLog });
    graph.listas.get('Servicios')!.columnas.delete('SerieEquipo');
    (
      graph.listas.get('Servicios')!.columnas.get('ServicioId') as { enforceUniqueValues: boolean }
    ).enforceUniqueValues = false;
    graph.listas.delete('Marcas');

    const problemas = await m.verificar({ graph, siteId: 'S' });

    expect(problemas).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Falta la columna Servicios.SerieEquipo'),
        expect.stringContaining('Servicios.ServicioId no exige valores únicos'),
        expect.stringContaining('Falta la lista o biblioteca Marcas'),
      ])
    );
  });
});

describe('cliente de Graph', () => {
  const respuesta = (
    estado: number,
    cuerpo: unknown,
    cabeceras: Record<string, string> = {}
  ): Response =>
    new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
      status: estado,
      headers: cabeceras,
    });

  it('reintenta con 429 respetando Retry-After', async () => {
    const esperar = vi.fn().mockResolvedValue(undefined);
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(respuesta(429, {}, { 'Retry-After': '3' }))
      .mockResolvedValueOnce(respuesta(200, { ok: true }));
    const graph = m.crearGraph({
      obtenerToken: async () => 'T',
      fetchFn: fetchFn as unknown as typeof fetch,
      esperar,
    });

    expect(await graph.get('/x')).toEqual({ ok: true });
    expect(esperar).toHaveBeenCalledWith(3000);
  });

  it('con un 401 renueva el token una sola vez', async () => {
    const obtenerToken = vi.fn().mockResolvedValueOnce('viejo').mockResolvedValueOnce('nuevo');
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(respuesta(401, {}))
      .mockResolvedValueOnce(respuesta(200, { ok: 1 }));
    const graph = m.crearGraph({ obtenerToken, fetchFn: fetchFn as unknown as typeof fetch });

    await graph.get('/x');

    expect(obtenerToken).toHaveBeenCalledTimes(2);
    expect(
      (fetchFn.mock.calls[1]![1] as { headers: Record<string, string> }).headers.Authorization
    ).toBe('Bearer nuevo');
  });

  it('un error no incluye el token en el mensaje', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        respuesta(403, { error: { code: 'accessDenied', message: 'Acceso denegado' } })
      );
    const graph = m.crearGraph({
      obtenerToken: async () => 'TOKEN-SECRETO-123',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const error = await graph.get('/sites/x?$select=id').catch((e: Error) => e);

    expect((error as Error).message).toMatch(/403.*accessDenied/);
    expect((error as Error).message).not.toContain('TOKEN-SECRETO-123');
  });

  it('getTodos sigue la paginación', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        respuesta(200, {
          value: [1, 2],
          '@odata.nextLink': 'https://graph.microsoft.com/v1.0/x?p=2',
        })
      )
      .mockResolvedValueOnce(respuesta(200, { value: [3] }));
    const graph = m.crearGraph({
      obtenerToken: async () => 'T',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(await graph.getTodos('/x')).toEqual([1, 2, 3]);
  });

  it('el mensaje de error del token nunca contiene el secreto', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        respuesta(401, { error: 'invalid_client', error_description: 'AADSTS7000222: expired' })
      );

    const error = await m
      .obtenerTokenAplicacion({
        tenant: 't',
        clientId: 'c',
        secreto: 'SECRETO-SUPER-SECRETO',
        fetchFn: fetchFn as unknown as typeof fetch,
      })
      .catch((e: Error) => e);

    expect((error as Error).message).toMatch(/invalid_client/);
    expect((error as Error).message).not.toContain('SECRETO-SUPER-SECRETO');
  });
});

describe('línea de comandos', () => {
  it('interpreta los argumentos y rechaza los desconocidos', () => {
    expect(
      m.leerArgumentos([
        '--site',
        'a/sites/B',
        '--aplicar',
        '--sin-datos',
        '--correo-ot',
        'x@y.co',
        '--anios',
        '2026, 2027',
      ])
    ).toMatchObject({
      site: 'a/sites/B',
      aplicar: true,
      sinDatos: true,
      correoOt: 'x@y.co',
      anios: ['2026', '2027'],
    });
    expect(m.leerArgumentos([])).toMatchObject({ aplicar: false });
    expect(() => m.leerArgumentos(['--secreto', 'abc'])).toThrow(/desconocido/);
  });

  it('separa host y ruta del sitio, con o sin https', () => {
    expect(m.partesDelSitio('siminticsas.sharepoint.com/sites/MineroIndustrial')).toEqual({
      host: 'siminticsas.sharepoint.com',
      ruta: '/sites/MineroIndustrial',
    });
    expect(m.partesDelSitio('https://siminticsas.sharepoint.com/sites/MineroIndustrial/')).toEqual({
      host: 'siminticsas.sharepoint.com',
      ruta: '/sites/MineroIndustrial',
    });
    expect(() => m.partesDelSitio('solo-host')).toThrow();
  });
});
