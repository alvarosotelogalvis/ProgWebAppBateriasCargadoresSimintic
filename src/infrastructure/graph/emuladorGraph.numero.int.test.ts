// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { EmuladorGraph } from '../../../tests/fixtures/graph/emuladorGraph';

/**
 * El emulador debe comportarse como el SharePoint real del spike S9 (docs/spikes/S9-numero-solicitud.md):
 * valor único en NumeroSolicitud (400), lectura del mayor con $orderby y unicidad que puede llegar tarde.
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
  ).json()) as {
    id: string;
  };
  const listas = (
    (await (await fetch(`${BASE}/sites/${sitio.id}/lists`)).json()) as {
      value: { id: string; name: string }[];
    }
  ).value;
  const ruta = `${BASE}/sites/${sitio.id}/lists/${listas.find((l) => l.name === 'Servicios')!.id}/items`;
  const crear = (servicioId: string, numero?: number) =>
    fetch(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          ServicioId: servicioId,
          ...(numero === undefined ? {} : { NumeroSolicitud: numero }),
        },
      }),
    });
  const mayor = async (): Promise<number | undefined> => {
    const r = (await (
      await fetch(
        `${ruta}?$expand=fields($select=NumeroSolicitud)&$orderby=fields/NumeroSolicitud desc&$top=1`
      )
    ).json()) as { value: { fields: { NumeroSolicitud?: number } }[] };
    return r.value[0]?.fields.NumeroSolicitud;
  };
  const porNumero = async (numero: number) =>
    (
      (await (
        await fetch(`${ruta}?$filter=fields/NumeroSolicitud eq ${numero}&$expand=fields`)
      ).json()) as {
        value: { id: string }[];
      }
    ).value;
  return { emulador, ruta, crear, mayor, porNumero };
};

describe('EmuladorGraph · NumeroSolicitud (T009)', () => {
  it('rechaza un número repetido con 400 como SharePoint real', async () => {
    const { crear } = await preparar();

    expect((await crear('a', 5)).status).toBe(201);
    const repetido = await crear('b', 5);

    expect(repetido.status).toBe(400);
    expect(JSON.stringify(await repetido.json())).toContain('unique constraints');
  });

  it('rechaza un PATCH a un número ya usado y acepta repetir el propio', async () => {
    const { crear, ruta } = await preparar();
    const a = (await (await crear('a', 1)).json()) as { id: string };
    const b = (await (await crear('b', 2)).json()) as { id: string };
    const patch = (id: string, numero: number) =>
      fetch(`${ruta}/${id}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ NumeroSolicitud: numero }),
      });

    expect((await patch(b.id, 1)).status).toBe(400);
    expect((await patch(a.id, 1)).status).toBe(200);
  });

  it('el número 0 o ausente no cuenta como valor único (varios pendientes)', async () => {
    const { crear } = await preparar();

    expect((await crear('a')).status).toBe(201);
    expect((await crear('b')).status).toBe(201);
    expect((await crear('c', 0)).status).toBe(201);
  });

  it('lee el mayor con $orderby desc y $top=1; sin ítems devuelve vacío', async () => {
    const { crear, mayor } = await preparar();
    expect(await mayor()).toBeUndefined();

    await crear('a', 1);
    await crear('b', 7);
    await crear('c', 3);

    expect(await mayor()).toBe(7);
  });

  it('filtra por NumeroSolicitud', async () => {
    const { crear, porNumero } = await preparar();
    await crear('a', 4);
    await crear('b', 5);

    expect(await porNumero(4)).toHaveLength(1);
    expect(await porNumero(9)).toHaveLength(0);
  });

  it('con la unicidad diferida (retraso real de SharePoint) acepta el duplicado hasta que se aplica', async () => {
    const { emulador, crear, porNumero } = await preparar();
    emulador.diferirUnicidadNumero();

    expect((await crear('a', 8)).status).toBe(201);
    expect((await crear('b', 8)).status).toBe(201);
    expect(await porNumero(8)).toHaveLength(2);

    emulador.aplicarUnicidadNumero();
    expect((await crear('c', 8)).status).toBe(400);
  });
});
