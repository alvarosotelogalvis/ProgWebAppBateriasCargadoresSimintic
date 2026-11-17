// @vitest-environment node
/**
 * PRUEBA EN VIVO (opcional): el código REAL de sincronización contra un SharePoint REAL.
 *
 * Qué prueba: subir un servicio con fotos y un PDF, descargarlo en otro «dispositivo» (con adjuntos y
 * miniaturas), editarlo y enviar los cambios con `If-Match`, vaciar un campo, un conflicto 412 resuelto, el
 * reenvío desde un tercer dispositivo sin duplicar y la eliminación remota. Todo lo que crea lo borra al terminar.
 *
 * Es OPCIONAL y NUNCA corre con `npm test`: escribe en un sitio real. Para ejecutarla hay que pedirlo expresamente:
 *   LIVE_CONFIRMAR=SI LIVE_SITE_URL=https://<tenant>.sharepoint.com/sites/<Sitio> LIVE_ENV_FILE=<ruta/.env> npm run test:live
 * El .env debe traer SP_TENANT_ID, SP_CLIENT_ID y SP_CLIENT_SECRET de una aplicación con Sites.Manage.All
 * (o Sites.Selected con rol de escritura). El secreto no se imprime ni se guarda.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { crearResolverConflictos } from '@/application/servicios/resolverConflictos';
import { refrescarCatalogosRemotos } from '@/application/setup/refrescarCatalogosSync';
import type { Adjunto } from '@/domain/adjunto';
import {
  idTemporalDeGuid,
  normalizarNombre,
  tituloDeNombre,
  type ClienteNuevo,
} from '@/domain/cliente';
import type { ClientesRemotos } from '@/application/ports/clientesRemotos';
import { generarCodigo } from '@/domain/codigo';
import type { Servicio } from '@/domain/servicio';

import { adjuntoBuilder } from '../builders/adjuntoBuilder';
import { servicioBuilder } from '../builders/servicioBuilder';
import { crearDispositivoReal, type DispositivoReal } from './entornoReal';

const SITIO = process.env.LIVE_SITE_URL;
const ARCHIVO_ENV = process.env.LIVE_ENV_FILE;
const habilitado = process.env.LIVE_CONFIRMAR === 'SI' && Boolean(SITIO) && Boolean(ARCHIVO_ENV);

const FOTO = readFileSync(resolve(process.cwd(), 'tests/live/foto-prueba.jpg'));
const PDF = readFileSync(resolve(process.cwd(), 'tests/fixtures/pdf/valido-200kb.pdf'));
const USUARIO_PRUEBA = 'prueba-viva@siminticsas.com';
const senal = (): AbortSignal => new AbortController().signal;

describe.skipIf(!habilitado)('sincronización REAL contra SharePoint real', () => {
  const ID = crypto.randomUUID();
  const SERIE = `LIVE${Date.now().toString().slice(-8)}`;
  let token: { valor: string; expira: number } = { valor: '', expira: 0 };
  let A: DispositivoReal;
  let B: DispositivoReal;
  const dispositivos: DispositivoReal[] = [];
  let sitioId = '';
  let driveId = '';
  let listas: Record<string, string> = {};
  let cliente = { id: 0, nombre: '' };
  let anio = '';
  let servicioA: Servicio;
  /** Número que debe recibir el servicio de A: el siguiente al mayor que había (ADR-0024). */
  let numeroEsperado = 0;
  /** ServicioId de los servicios de la prueba de numeración simultánea (se borran al final). */
  const idsNumeracion: string[] = [];
  /** Todos los clientes de prueba empiezan con este prefijo: la limpieza borra los que lo lleven (spec 010). */
  const PREFIJO_CLIENTE = `ZZ LIVE ${Date.now().toString().slice(-6)}`;

  const obtenerToken = async (): Promise<string> => {
    if (Date.now() < token.expira) return token.valor;
    const { obtenerTokenAplicacion } = (await import(
      /* @vite-ignore */ pathToFileURL(
        resolve(process.cwd(), 'scripts/provision-sharepoint-graph.mjs')
      ).href
    )) as { obtenerTokenAplicacion: (o: Record<string, string>) => Promise<string> };
    token = {
      valor: await obtenerTokenAplicacion({
        tenant: process.env.SP_TENANT_ID!,
        clientId: process.env.SP_CLIENT_ID!,
        secreto: process.env.SP_CLIENT_SECRET!,
      }),
      expira: Date.now() + 45 * 60_000,
    };
    return token.valor;
  };

  /** Lectura/escritura directa a Graph para VERIFICAR lo que dejó el motor (independiente del código de la app). */
  const crudo = async (
    metodo: string,
    ruta: string,
    cuerpo?: unknown,
    cabeceras: Record<string, string> = {}
  ) => {
    const r = await fetch(`https://graph.microsoft.com/v1.0${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${await obtenerToken()}`,
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...cabeceras,
      },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
    });
    const texto = await r.text();
    return { estado: r.status, json: texto ? (JSON.parse(texto) as Record<string, any>) : {} }; // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  const itemsRemotos = async (servicioId: string) => {
    const r = await crudo(
      'GET',
      `/sites/${sitioId}/lists/${listas.Servicios}/items?$filter=fields/ServicioId eq '${servicioId}'&$expand=fields`,
      undefined,
      { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' }
    );
    return (r.json.value ?? []) as { id: string; fields: Record<string, unknown> }[];
  };

  const archivosRemotos = async () => {
    const r = await crudo(
      'GET',
      `/drives/${driveId}/root:/${anio}/${ID}:/children?$expand=listItem($expand=fields($select=ServicioId,AdjuntoId,TipoAdjunto))`
    );
    return (r.json.value ?? []) as {
      id: string;
      name: string;
      size: number;
      listItem?: { fields: Record<string, unknown> };
    }[];
  };

  const nuevoAdjunto = (tipo: 'FOTO_INGRESO' | 'COTIZACION', n: number): Adjunto => {
    const esFoto = tipo === 'FOTO_INGRESO';
    const contenido = esFoto ? FOTO : PDF;
    return adjuntoBuilder()
      .conCampos({
        id: crypto.randomUUID(),
        servicioId: ID,
        tipo,
        nombreArchivo: esFoto ? `foto-${n}.jpg` : 'cotizacion.pdf',
        mime: esFoto ? 'image/jpeg' : 'application/pdf',
        blob: new Blob([contenido], { type: esFoto ? 'image/jpeg' : 'application/pdf' }),
        tamanoBytes: contenido.length,
        sha256: String(n).padStart(64, '0'),
        miniatura: null,
        syncState: 'pending',
      })
      .construir();
  };

  beforeAll(async () => {
    process.loadEnvFile(ARCHIVO_ENV!);
    A = await crearDispositivoReal({ nombre: 'A', siteUrl: SITIO!, obtenerToken });
    B = await crearDispositivoReal({ nombre: 'B', siteUrl: SITIO!, obtenerToken });
    dispositivos.push(A, B);
    const sitio = await A.gateway.resolverSitio();
    sitioId = sitio.siteId;
    driveId = sitio.driveId;
    listas = sitio.listas;
  });

  afterAll(async () => {
    // LIMPIEZA: borra todo lo creado (ítems, carpeta de adjuntos y entradas de bitácora de la prueba).
    const resumen: string[] = [];
    try {
      for (const id of [ID, ...idsNumeracion]) {
        for (const item of await itemsRemotos(id)) {
          resumen.push(
            `ítem ${(await crudo('DELETE', `/sites/${sitioId}/lists/${listas.Servicios}/items/${item.id}`)).estado}`
          );
        }
      }
      // Clientes de prueba (se borran después de los servicios que los usaban) y su rastro en la bitácora.
      const clientes = await crudo(
        'GET',
        `/sites/${sitioId}/lists/${listas.Clientes}/items?$expand=fields($select=Title)&$top=999`
      );
      for (const cliente of (clientes.json.value ?? []) as {
        id: string;
        fields: { Title?: string };
      }[]) {
        if (cliente.fields.Title?.startsWith(PREFIJO_CLIENTE)) {
          resumen.push(
            `cliente ${(await crudo('DELETE', `/sites/${sitioId}/lists/${listas.Clientes}/items/${cliente.id}`)).estado}`
          );
        }
      }
      const fusiones = await crudo(
        'GET',
        `/sites/${sitioId}/lists/${listas.LogSincronizacion}/items?$expand=fields($select=Title,Detalle)&$top=200`
      );
      for (const entrada of (fusiones.json.value ?? []) as {
        id: string;
        fields: { Title?: string; Detalle?: string };
      }[]) {
        if (
          entrada.fields.Title === 'Fusión de clientes' &&
          entrada.fields.Detalle?.includes(PREFIJO_CLIENTE)
        ) {
          await crudo(
            'DELETE',
            `/sites/${sitioId}/lists/${listas.LogSincronizacion}/items/${entrada.id}`
          );
        }
      }
      const carpeta = await crudo('GET', `/drives/${driveId}/root:/${anio}/${ID}`);
      if (carpeta.estado === 200)
        resumen.push(
          `carpeta ${(await crudo('DELETE', `/drives/${driveId}/items/${carpeta.json.id}`)).estado}`
        );
      const log = await crudo(
        'GET',
        `/sites/${sitioId}/lists/${listas.LogSincronizacion}/items?$expand=fields($select=Usuario)&$top=200`
      );
      for (const entrada of (log.json.value ?? []) as {
        id: string;
        fields: { Usuario?: string };
      }[]) {
        if (entrada.fields.Usuario === USUARIO_PRUEBA)
          await crudo(
            'DELETE',
            `/sites/${sitioId}/lists/${listas.LogSincronizacion}/items/${entrada.id}`
          );
      }
      const quedan = (await itemsRemotos(ID)).length;
      // eslint-disable-next-line no-console
      console.log(
        `LIMPIEZA: ${resumen.join(', ') || 'nada que borrar'} | ítems de la prueba que quedan: ${quedan}`
      );
    } finally {
      await Promise.all(dispositivos.map((d) => d.cerrar()));
    }
  });

  it('lee los catálogos reales (clientes y valores de Choice) con el código de la app', async () => {
    const catalogos = await A.gateway.leerCatalogos();

    expect(catalogos.clientes.length).toBeGreaterThanOrEqual(1);
    for (const columna of ['Diagnostico', 'Estado', 'CotizacionEstado', 'TipoEquipo'] as const) {
      expect(catalogos.choices[columna].length, `Choice ${columna} vacío`).toBeGreaterThan(0);
    }
    cliente = { id: catalogos.clientes[0]!.id, nombre: catalogos.clientes[0]!.nombre };
    for (const d of [A, B])
      await refrescarCatalogosRemotos({
        gateway: d.gateway,
        catalogos: d.catalogos,
        logger: d.logger,
      });
  });

  it('A: sube un servicio con 2 fotos y 1 PDF y SharePoint lo deja como la app espera', async () => {
    servicioA = {
      ...servicioBuilder().conId(ID).recibido().pendiente().construir(),
      serie: SERIE,
      // Sin número: lo asigna la sincronización (spec 011).
      numeroSolicitud: 0,
      marca: 'ROQUET',
      referencia: 'REF-VIVA',
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      camposSucios: [],
    };
    servicioA.codigo = generarCodigo(servicioA);
    expect(servicioA.codigo).toContain('-PEND-');
    numeroEsperado = (await A.gateway.ultimoNumeroSolicitud()) + 1;
    anio = servicioA.fechaRecepcion.slice(0, 4);
    await A.servicios.guardar(servicioA);
    for (const adjunto of [
      nuevoAdjunto('FOTO_INGRESO', 1),
      nuevoAdjunto('FOTO_INGRESO', 2),
      nuevoAdjunto('COTIZACION', 3),
    ]) {
      await A.adjuntos.guardar(adjunto);
    }

    const resumen = await A.sincronizar();

    expect(resumen).toMatchObject({
      subidos: 1,
      archivos: 3,
      errores: 0,
      conflictos: 0,
      resultado: 'OK',
    });
    const items = await itemsRemotos(ID);
    expect(items).toHaveLength(1);
    expect(items[0]!.fields).toMatchObject({
      ServicioId: ID,
      Estado: 'Recibido',
      SerieEquipo: SERIE,
      NumeroSolicitud: numeroEsperado,
      Title: generarCodigo({ ...servicioA, numeroSolicitud: numeroEsperado }),
      Marca: 'ROQUET',
      Referencia: 'REF-VIVA',
      ClienteLookupId: String(cliente.id),
    });
    expect(String(items[0]!.fields.FechaRecepcion).slice(0, 10)).toBe(servicioA.fechaRecepcion);
    const archivos = await archivosRemotos();
    expect(archivos).toHaveLength(3);
    expect(archivos.map((a) => a.name.split('.').pop()).sort()).toEqual(['jpg', 'jpg', 'pdf']);
    expect(archivos.map((a) => a.listItem?.fields.TipoAdjunto).sort()).toEqual([
      'Cotización',
      'Foto ingreso',
      'Foto ingreso',
    ]);
    expect(archivos.every((a) => a.listItem?.fields.ServicioId === ID && a.size > 0)).toBe(true);
    // El servicio local queda sincronizado y con los datos remotos (eTag, id del ítem).
    const local = await A.servicios.obtener(ID);
    expect(local).toMatchObject({
      numeroSolicitud: numeroEsperado,
      codigo: generarCodigo({ ...servicioA, numeroSolicitud: numeroEsperado }),
    });
    expect(local).toMatchObject({ syncState: 'synced', camposSucios: [] });
    expect(local?.sp?.itemId).toBe(items[0]!.id);
    expect(local?.sp?.eTag.startsWith('"')).toBe(true);
  });

  it('B: descarga el servicio por delta, con sus adjuntos remotos y las miniaturas de las fotos', async () => {
    const resultado = await B.pull({ signal: senal() });

    expect(resultado.descargados).toBe(1);
    const local = await B.servicios.obtener(ID);
    expect(local).toMatchObject({
      estado: 'RECIBIDO',
      serie: SERIE,
      marca: 'ROQUET',
      referencia: 'REF-VIVA',
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      numeroSolicitud: numeroEsperado,
      syncState: 'synced',
      origen: 'remoto',
    });
    expect(local?.fechaRecepcion).toBe(servicioA.fechaRecepcion);

    expect(await B.listarAdjuntosRemotos(ID, senal())).toBe(3);
    expect(await B.descargarMiniaturas([ID], senal())).toBeGreaterThanOrEqual(2);
    const adjuntos = await B.adjuntos.listarPorServicio(ID);
    expect(adjuntos).toHaveLength(3);
    expect(adjuntos.every((a) => a.blob === null && a.sp)).toBe(true); // remotos: sin contenido
    const miniaturas = adjuntos.filter((a) => a.miniatura && a.miniatura.size > 0);
    expect(miniaturas).toHaveLength(2); // solo las fotos
  });

  it('A edita varios campos y B los recibe (PATCH con If-Match y delta)', async () => {
    const actual = (await A.servicios.obtener(ID))!;
    await A.servicios.guardar({
      ...actual,
      estado: 'DIAGNOSTICADO',
      diagnostico: 'Reparable',
      observacionTecnica: 'Observación escrita en A',
      otDetalle: 'Detalle escrito en A',
      camposSucios: ['estado', 'diagnostico', 'observacionTecnica', 'otDetalle'],
      syncState: 'pending',
      actualizadoEn: new Date().toISOString(),
    });

    const resumen = await A.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, errores: 0, conflictos: 0, resultado: 'OK' });
    expect((await itemsRemotos(ID))[0]!.fields).toMatchObject({
      Estado: 'Diagnosticado',
      Diagnostico: 'Reparable',
      ObservacionTecnica: 'Observación escrita en A',
    });

    const pull = await B.pull({ signal: senal() });
    expect(pull.actualizados).toBe(1);
    expect(await B.servicios.obtener(ID)).toMatchObject({
      estado: 'DIAGNOSTICADO',
      diagnostico: 'Reparable',
      observacionTecnica: 'Observación escrita en A',
      syncState: 'synced',
    });
  });

  it('A vacía un campo: SharePoint lo deja vacío y B lo quita (borrado remoto de campos)', async () => {
    const actual = (await A.servicios.obtener(ID))!;
    const { otDetalle: _quitado, ...sin } = actual;
    await A.servicios.guardar({
      ...sin,
      camposSucios: ['otDetalle'],
      syncState: 'pending',
      actualizadoEn: new Date().toISOString(),
    });

    const resumen = await A.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, errores: 0, resultado: 'OK' });
    expect('OTDetalle' in (await itemsRemotos(ID))[0]!.fields).toBe(false);

    await B.pull({ signal: senal() });
    const enB = (await B.servicios.obtener(ID))!;
    expect('otDetalle' in enB).toBe(false);
    expect(enB.diagnostico).toBe('Reparable'); // lo demás no se toca
  });

  it('conflicto 412: B y A cambian la misma referencia; B queda en conflicto y lo resuelve con el valor de SharePoint', async () => {
    const enB = (await B.servicios.obtener(ID))!;
    await B.servicios.guardar({
      ...enB,
      referencia: 'DESDE-B',
      camposSucios: ['referencia'],
      syncState: 'pending',
      actualizadoEn: new Date().toISOString(),
    });
    const enA = (await A.servicios.obtener(ID))!;
    await A.servicios.guardar({
      ...enA,
      referencia: 'DESDE-A',
      camposSucios: ['referencia'],
      syncState: 'pending',
      actualizadoEn: new Date().toISOString(),
    });
    await A.sincronizar(); // A llega primero

    const resumen = await B.sincronizar(); // B envía con un eTag ya desactualizado → 412

    expect(resumen.conflictos).toBe(1);
    const conflicto = (await B.servicios.obtener(ID))!;
    expect(conflicto.syncState).toBe('conflict');
    expect(conflicto.conflictos).toEqual([
      expect.objectContaining({ campo: 'referencia', local: 'DESDE-B', remoto: 'DESDE-A' }),
    ]);
    expect((await itemsRemotos(ID))[0]!.fields.Referencia).toBe('DESDE-A'); // el 412 no pisó lo de A

    await crearResolverConflictos({ servicios: B.servicios, clock: B.clock })(ID, [
      { campo: 'referencia', usar: 'REMOTO' },
    ]);
    const final = await B.sincronizar();
    expect(final).toMatchObject({ errores: 0, conflictos: 0 });
    expect(await B.servicios.obtener(ID)).toMatchObject({
      referencia: 'DESDE-A',
      syncState: 'synced',
      conflictos: [],
    });
  });

  it('un tercer dispositivo que reenvía el mismo servicio no crea un duplicado (idempotencia por ServicioId)', async () => {
    const C = await crearDispositivoReal({ nombre: 'C', siteUrl: SITIO!, obtenerToken });
    dispositivos.push(C);
    const copia: Servicio = { ...servicioA, syncState: 'pending', camposSucios: [] };
    delete copia.sp;
    await C.servicios.guardar(copia);

    const resumen = await C.sincronizar();

    expect(resumen.errores).toBe(0);
    expect(await itemsRemotos(ID)).toHaveLength(1);
  });

  it('si alguien elimina el servicio en SharePoint, B lo elimina de su dispositivo', async () => {
    const [item] = await itemsRemotos(ID);
    expect(
      (await crudo('DELETE', `/sites/${sitioId}/lists/${listas.Servicios}/items/${item!.id}`))
        .estado
    ).toBe(204);

    const resultado = await B.pull({ signal: senal() });

    expect(resultado.eliminados).toBe(1);
    expect(await B.servicios.obtener(ID)).toBeUndefined();
  });

  it('dos dispositivos suben 5 servicios cada uno a la vez: los 10 números son únicos y consecutivos (CE-011-01)', async () => {
    const D = await crearDispositivoReal({ nombre: 'D', siteUrl: SITIO!, obtenerToken });
    const E = await crearDispositivoReal({ nombre: 'E', siteUrl: SITIO!, obtenerToken });
    dispositivos.push(D, E);
    const maximoAntes = await D.gateway.ultimoNumeroSolicitud();
    const crearPendiente = async (dispositivo: DispositivoReal, indice: number) => {
      const id = crypto.randomUUID();
      idsNumeracion.push(id);
      const base = servicioBuilder().conId(id).recibido().pendiente().construir();
      const servicio: Servicio = {
        ...base,
        serie: `NUM${Date.now().toString().slice(-6)}${indice}`,
        numeroSolicitud: 0,
        marca: 'ROQUET',
        referencia: 'REF-NUM',
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        camposSucios: [],
        actualizadoEn: new Date(Date.now() + indice * 1000).toISOString(),
      };
      servicio.codigo = generarCodigo(servicio);
      await dispositivo.servicios.guardar(servicio);
      return id;
    };
    const idsD: string[] = [];
    const idsE: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      idsD.push(await crearPendiente(D, i));
      idsE.push(await crearPendiente(E, i + 5));
    }

    const [resD, resE] = await Promise.all([D.sincronizar(), E.sincronizar()]);

    const reintentos = [...D.logger.eventos, ...E.logger.eventos].filter(
      (evento) => evento.evento === 'sync.numeroSolicitud.reintento'
    );
    // eslint-disable-next-line no-console
    console.log(
      `NUMERACION: reintentos por choque o verificación = ${reintentos.length} ${JSON.stringify(
        reintentos.map((r) => r.datos?.motivo)
      )}`
    );
    expect(resD).toMatchObject({ subidos: 5, errores: 0, resultado: 'OK' });
    expect(resE).toMatchObject({ subidos: 5, errores: 0, resultado: 'OK' });
    const remotos: { id: string; numero: number; titulo: string }[] = [];
    for (const id of [...idsD, ...idsE]) {
      const [item] = await itemsRemotos(id);
      expect(item, `falta el servicio ${id} en SharePoint`).toBeDefined();
      remotos.push({
        id,
        numero: Number(item!.fields.NumeroSolicitud),
        titulo: String(item!.fields.Title),
      });
    }
    const numeros = remotos.map((r) => r.numero).sort((a, b) => a - b);
    // Únicos y consecutivos a partir del mayor que había.
    expect(numeros).toEqual(Array.from({ length: 10 }, (_, i) => maximoAntes + 1 + i));
    // Cada servicio local coincide con SharePoint (número y código), en ambos dispositivos.
    for (const { id, numero, titulo } of remotos) {
      const dispositivo = idsD.includes(id) ? D : E;
      const local = await dispositivo.servicios.obtener(id);
      expect(local?.numeroSolicitud).toBe(numero);
      expect(local?.codigo).toBe(titulo);
      expect(titulo).not.toContain('PEND');
    }
    // Nadie quedó con un número repetido en toda la lista.
    for (const numero of numeros) {
      const r = await crudo(
        'GET',
        `/sites/${sitioId}/lists/${listas.Servicios}/items?$filter=fields/NumeroSolicitud eq ${numero}&$select=id`
      );
      expect(r.json.value, `número ${numero} repetido`).toHaveLength(1);
    }
  });

  /** Servicio nuevo, sin número, que usa el cliente indicado (un id real de SharePoint o uno temporal). */
  const pendienteDeCliente = async (
    dispositivo: DispositivoReal,
    clienteId: number,
    clienteNombre: string,
    indice: number
  ): Promise<string> => {
    const id = crypto.randomUUID();
    idsNumeracion.push(id);
    const base = servicioBuilder().conId(id).recibido().pendiente().construir();
    const servicio: Servicio = {
      ...base,
      serie: `CLI${Date.now().toString().slice(-6)}${indice}`,
      numeroSolicitud: 0,
      marca: 'ROQUET',
      referencia: 'REF-CLI',
      clienteId,
      clienteNombre,
      camposSucios: [],
      actualizadoEn: new Date(Date.now() + indice * 1000).toISOString(),
    };
    servicio.codigo = generarCodigo(servicio);
    await dispositivo.servicios.guardar(servicio);
    return id;
  };

  const serviciosDelCliente = async (clienteId: number): Promise<string[]> => {
    const r = await crudo(
      'GET',
      `/sites/${sitioId}/lists/${listas.Servicios}/items?$filter=fields/ClienteLookupId eq ${clienteId}&$expand=fields($select=ServicioId)&$top=200`
    );
    return ((r.json.value ?? []) as { fields: { ServicioId: string } }[]).map(
      (i) => i.fields.ServicioId
    );
  };

  it('dos dispositivos crean el mismo cliente nuevo sin red y sincronizan a la vez: queda un solo cliente (ES-010-04)', async () => {
    const F = await crearDispositivoReal({ nombre: 'F', siteUrl: SITIO!, obtenerToken });
    const G = await crearDispositivoReal({ nombre: 'G', siteUrl: SITIO!, obtenerToken });
    dispositivos.push(F, G);
    const nombre = `${PREFIJO_CLIENTE} UNICO`;
    const normalizado = normalizarNombre(nombre);
    const nuevoCliente = (): ClienteNuevo => {
      const guid = crypto.randomUUID();
      return {
        id: idTemporalDeGuid(guid),
        guid,
        nombre: tituloDeNombre(nombre),
        normalizado,
        creadoEn: new Date().toISOString(),
      };
    };
    const enF = nuevoCliente();
    const enG = nuevoCliente();
    await F.clientesLocales.agregar(enF);
    await G.clientesLocales.agregar(enG);
    const servicioF = await pendienteDeCliente(F, enF.id, enF.nombre, 0);
    const servicioG = await pendienteDeCliente(G, enG.id, enG.nombre, 1);

    const [resF, resG] = await Promise.all([F.sincronizar(), G.sincronizar()]);

    expect(resF).toMatchObject({ subidos: 1, errores: 0, resultado: 'OK' });
    expect(resG).toMatchObject({ subidos: 1, errores: 0, resultado: 'OK' });
    const clientes = await F.clientesRemotos.buscarPorNormalizado(normalizado);
    expect(clientes, 'debe existir un solo cliente con ese nombre').toHaveLength(1);
    expect(clientes[0]).toMatchObject({ nombre: tituloDeNombre(nombre), activo: true });
    expect((await serviciosDelCliente(clientes[0]!.id)).sort()).toEqual(
      [servicioF, servicioG].sort()
    );
    // Los dos dispositivos quedaron con el id real y sin clientes pendientes.
    expect((await F.servicios.obtener(servicioF))?.clienteId).toBe(clientes[0]!.id);
    expect((await G.servicios.obtener(servicioG))?.clienteId).toBe(clientes[0]!.id);
    expect(await F.clientesLocales.listar()).toEqual([]);
    expect(await G.clientesLocales.listar()).toEqual([]);
  });

  it('fusiona un cliente con 10 servicios con un corte a mitad, lo reanuda y conserva el origen (ES-010-06, ES-010-07)', async () => {
    const H = await crearDispositivoReal({ nombre: 'H', siteUrl: SITIO!, obtenerToken });
    dispositivos.push(H);
    const crear = (sufijo: string) => {
      const titulo = `${PREFIJO_CLIENTE} ${sufijo}`;
      return H.clientesRemotos.crearCliente({
        guid: crypto.randomUUID(),
        titulo: tituloDeNombre(titulo),
        normalizado: normalizarNombre(titulo),
      });
    };
    const origen = await crear('ORIGEN');
    const destino = await crear('DESTINO');
    for (let i = 0; i < 10; i += 1) await pendienteDeCliente(H, origen.id, origen.nombre, 10 + i);
    expect(await H.sincronizar()).toMatchObject({ subidos: 10, errores: 0, resultado: 'OK' });
    expect(await serviciosDelCliente(origen.id)).toHaveLength(10);

    // Corte simulado en la 4ª reasignación.
    let llamadas = 0;
    const conCorte = (real: ClientesRemotos): ClientesRemotos => ({
      listarClientes: () => real.listarClientes(),
      buscarPorGuid: (g) => real.buscarPorGuid(g),
      buscarPorNormalizado: (x) => real.buscarPorNormalizado(x),
      crearCliente: (c) => real.crearCliente(c),
      desactivarFusionado: (o, d) => real.desactivarFusionado(o, d),
      listarServiciosDeCliente: (id) => real.listarServiciosDeCliente(id),
      reasignarServicio: async (item, id) => {
        llamadas += 1;
        if (llamadas === 4) throw new Error('corte simulado');
        return real.reasignarServicio(item, id);
      },
      registrarDetalleLog: (e) => real.registrarDetalleLog(e),
    });
    const opciones = {
      origenId: origen.id,
      destinoId: destino.id,
      roles: ['Administrador'] as const,
    };

    await expect(H.fusionar(opciones, conCorte)).rejects.toThrow('corte simulado');
    const tras = (await H.clientesRemotos.listarClientes()).find((c) => c.id === origen.id);
    expect(tras?.activo, 'tras un corte el origen sigue activo').toBe(true);
    const faltan = (await serviciosDelCliente(origen.id)).length;
    expect(faltan).toBeGreaterThan(0);
    expect(faltan).toBeLessThan(10);

    const resultado = await H.fusionar(opciones);

    expect(resultado.destinoId).toBe(destino.id);
    expect(resultado.reasignados).toBe(faltan);
    expect(await serviciosDelCliente(origen.id)).toEqual([]);
    expect(await serviciosDelCliente(destino.id)).toHaveLength(10);
    // El origen se conserva: inactivo y fusionado en el destino (no se borra).
    const origenFinal = (await H.clientesRemotos.listarClientes()).find((c) => c.id === origen.id);
    expect(origenFinal).toMatchObject({ activo: false, fusionadoCon: destino.id });
    // El catálogo ya no ofrece el origen e informa la fusión.
    const catalogos = await H.gateway.leerCatalogos();
    expect(catalogos.clientes.map((c) => c.id)).not.toContain(origen.id);
    expect(catalogos.fusionados).toContainEqual({ origenId: origen.id, destinoId: destino.id });
    // Y quedó en la bitácora.
    const bitacora = await crudo(
      'GET',
      `/sites/${sitioId}/lists/${listas.LogSincronizacion}/items?$expand=fields($select=Title,Detalle)&$top=200`
    );
    const detalles = (
      (bitacora.json.value ?? []) as { fields: { Title?: string; Detalle?: string } }[]
    )
      .filter((i) => i.fields.Title === 'Fusión de clientes')
      .map((i) => i.fields.Detalle ?? '');
    expect(detalles.some((d) => d.includes(PREFIJO_CLIENTE) && d.includes('servicio'))).toBe(true);

    // ES-010-08: otro dispositivo con un servicio pendiente del cliente fusionado lo sube con el vigente.
    const I = await crearDispositivoReal({ nombre: 'I', siteUrl: SITIO!, obtenerToken });
    dispositivos.push(I);
    const pendiente = await pendienteDeCliente(I, origen.id, origen.nombre, 30);

    expect(await I.sincronizar()).toMatchObject({ subidos: 1, errores: 0, conflictos: 0 });

    expect((await I.servicios.obtener(pendiente))?.clienteId).toBe(destino.id);
    expect(await serviciosDelCliente(origen.id)).toEqual([]);
    expect(await serviciosDelCliente(destino.id)).toContain(pendiente);
  });
});
