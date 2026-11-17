// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { EmuladorGraph } from '../../../tests/fixtures/graph/emuladorGraph';

/**
 * El emulador debe comportarse como el SharePoint real del spike S10 (docs/spikes/S10-clientes.md):
 * ClienteGuid y NombreNormalizado únicos (400, inmediato, y los vacíos no cuentan), filtros por nombre
 * normalizado, guid, Activo y por el lookup `ClienteLookupId`, y los inactivos siguen apareciendo en la lista.
 */
const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const BASE = 'https://graph.microsoft.com/v1.0';

const preparar = async () => {
  const emulador = new EmuladorGraph();
  servidor.use(...emulador.handlers());
  const sitio = (await (
    await fetch(`${BASE}/sites/empresa.sharepoint.com:/sites/ServicioTecnicoBC-DEV`)
  ).json()) as { id: string };
  const listas = (
    (await (await fetch(`${BASE}/sites/${sitio.id}/lists`)).json()) as {
      value: { id: string; name: string }[];
    }
  ).value;
  const ruta = (nombre: string) =>
    `${BASE}/sites/${sitio.id}/lists/${listas.find((l) => l.name === nombre)!.id}/items`;
  const enviar = (url: string, metodo: string, cuerpo: unknown) =>
    fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  const crearCliente = (fields: Record<string, unknown>) =>
    enviar(ruta('Clientes'), 'POST', { fields });
  const crearServicio = (fields: Record<string, unknown>) =>
    enviar(ruta('Servicios'), 'POST', { fields });
  const listar = async (nombre: string, consulta: string) =>
    (
      (await (await fetch(`${ruta(nombre)}?${consulta}`)).json()) as {
        value: { id: string; fields: Record<string, unknown> }[];
      }
    ).value;
  return { emulador, ruta, enviar, crearCliente, crearServicio, listar };
};

describe('EmuladorGraph · Clientes (T008)', () => {
  it('rechaza un ClienteGuid repetido con 400 como SharePoint real', async () => {
    const { crearCliente } = await preparar();

    expect(
      (await crearCliente({ Title: 'A', ClienteGuid: 'g-1', NombreNormalizado: 'A' })).status
    ).toBe(201);
    const repetido = await crearCliente({ Title: 'B', ClienteGuid: 'g-1', NombreNormalizado: 'B' });

    expect(repetido.status).toBe(400);
    expect(JSON.stringify(await repetido.json())).toContain('unique constraints');
  });

  it('rechaza un NombreNormalizado repetido (aunque el guid sea distinto)', async () => {
    const { crearCliente } = await preparar();
    await crearCliente({ Title: 'ARIS', ClienteGuid: 'g-1', NombreNormalizado: 'ARIS' });

    const repetido = await crearCliente({
      Title: 'Aris',
      ClienteGuid: 'g-2',
      NombreNormalizado: 'ARIS',
    });

    expect(repetido.status).toBe(400);
  });

  it('el rechazo es inmediato: no hay retraso como en NumeroSolicitud (spike S10)', async () => {
    const { crearCliente } = await preparar();
    await crearCliente({ Title: 'A', NombreNormalizado: 'A' });

    expect((await crearCliente({ Title: 'A2', NombreNormalizado: 'A' })).status).toBe(400);
  });

  it('los valores vacíos o ausentes no cuentan como repetidos (clientes sin guid)', async () => {
    const { crearCliente } = await preparar();

    expect((await crearCliente({ Title: 'A' })).status).toBe(201);
    expect((await crearCliente({ Title: 'B' })).status).toBe(201);
    expect(
      (await crearCliente({ Title: 'C', ClienteGuid: '', NombreNormalizado: '' })).status
    ).toBe(201);
  });

  it('un PATCH a un valor ya usado falla y repetir el propio valor se acepta', async () => {
    const { crearCliente, enviar, ruta } = await preparar();
    const a = (await (await crearCliente({ Title: 'A', NombreNormalizado: 'A' })).json()) as {
      id: string;
    };
    const b = (await (await crearCliente({ Title: 'B', NombreNormalizado: 'B' })).json()) as {
      id: string;
    };
    const parchar = (id: string, nombre: string) =>
      enviar(`${ruta('Clientes')}/${id}/fields`, 'PATCH', { NombreNormalizado: nombre });

    expect((await parchar(b.id, 'A')).status).toBe(400);
    expect((await parchar(a.id, 'A')).status).toBe(200);
  });

  it('filtra por NombreNormalizado, por ClienteGuid y por Activo', async () => {
    const { crearCliente, listar } = await preparar();
    await crearCliente({ Title: 'A', ClienteGuid: 'g-a', NombreNormalizado: 'A', Activo: true });
    await crearCliente({ Title: 'B', ClienteGuid: 'g-b', NombreNormalizado: 'B', Activo: false });

    const porNombre = await listar('Clientes', "$filter=fields/NombreNormalizado eq 'A'");
    const porGuid = await listar('Clientes', "$filter=fields/ClienteGuid eq 'g-b'");
    const activos = await listar('Clientes', '$filter=fields/Activo eq 1');
    const inactivos = await listar('Clientes', '$filter=fields/Activo eq 0');

    expect(porNombre.map((i) => i.fields.Title)).toEqual(['A']);
    expect(porGuid.map((i) => i.fields.Title)).toEqual(['B']);
    expect(activos.map((i) => i.fields.Title)).not.toContain('B');
    expect(activos.map((i) => i.fields.Title)).toContain('A');
    expect(inactivos.map((i) => i.fields.Title)).toContain('B');
    expect(inactivos.map((i) => i.fields.Title)).not.toContain('A');
  });

  it('la lista sin filtro sigue devolviendo los inactivos y sus FusionadoConId', async () => {
    const { crearCliente, listar } = await preparar();
    await crearCliente({ Title: 'VIEJO', Activo: false, FusionadoConId: 9 });

    const todos = await listar('Clientes', '$top=100');

    expect(todos.find((i) => i.fields.Title === 'VIEJO')?.fields).toMatchObject({
      Activo: false,
      FusionadoConId: 9,
    });
  });

  it('un filtro por un texto con comillas se compara como texto', async () => {
    const { crearCliente, listar } = await preparar();
    await crearCliente({ Title: "O'BRIEN", NombreNormalizado: "O'BRIEN" });

    const r = await listar('Clientes', "$filter=fields/NombreNormalizado eq 'O''BRIEN'");

    expect(r).toHaveLength(1);
  });
});

describe('EmuladorGraph · Servicios por cliente (T008)', () => {
  it('filtra Servicios por el lookup ClienteLookupId', async () => {
    const { crearServicio, listar } = await preparar();
    await crearServicio({ ServicioId: 's1', ClienteLookupId: 10 });
    await crearServicio({ ServicioId: 's2', ClienteLookupId: 10 });
    await crearServicio({ ServicioId: 's3', ClienteLookupId: 11 });

    const deDiez = await listar('Servicios', '$filter=fields/ClienteLookupId eq 10');

    expect(deDiez.map((i) => i.fields.ServicioId).sort()).toEqual(['s1', 's2']);
    expect(await listar('Servicios', '$filter=fields/ClienteLookupId eq 99')).toEqual([]);
  });

  it('reasignar el cliente con PATCH se refleja de inmediato en el filtro (ES-010-06)', async () => {
    const { crearServicio, enviar, ruta, listar } = await preparar();
    const s = (await (await crearServicio({ ServicioId: 's1', ClienteLookupId: 10 })).json()) as {
      id: string;
    };

    const respuesta = await enviar(`${ruta('Servicios')}/${s.id}/fields`, 'PATCH', {
      ClienteLookupId: 11,
    });

    expect(respuesta.status).toBe(200);
    expect(await listar('Servicios', '$filter=fields/ClienteLookupId eq 10')).toEqual([]);
    expect(await listar('Servicios', '$filter=fields/ClienteLookupId eq 11')).toHaveLength(1);
  });

  it('el id del lookup se compara como número aunque SharePoint lo devuelva como texto', async () => {
    const { crearServicio, listar } = await preparar();
    await crearServicio({ ServicioId: 's1', ClienteLookupId: '10' });

    expect(await listar('Servicios', '$filter=fields/ClienteLookupId eq 10')).toHaveLength(1);
  });

  it('el filtro por ServicioId de siempre sigue funcionando junto a los nuevos', async () => {
    const { crearServicio, listar } = await preparar();
    await crearServicio({ ServicioId: 's1', ClienteLookupId: 10 });
    await crearServicio({ ServicioId: 's2', ClienteLookupId: 10 });

    const r = await listar('Servicios', "$filter=fields/ServicioId eq 's2'");

    expect(r.map((i) => i.fields.ServicioId)).toEqual(['s2']);
  });
});
