// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { crearResolverConflictos } from '@/application/servicios/resolverConflictos';
import type { Servicio } from '@/domain/servicio';
import { aCamposSP } from '@/infrastructure/graph/mappers/servicioMapper';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import {
  crearEntornoSync,
  type EntornoSync,
  type OpcionesEntornoSync,
} from '../../../tests/fixtures/sync/crearEntornoSync';

const servidor = setupServer();
let entornos: EntornoSync[] = [];

const crear = async (opciones?: OpcionesEntornoSync): Promise<EntornoSync> => {
  const entorno = await crearEntornoSync({ conPull: true, sinLogRemoto: true, ...opciones });
  entornos.push(entorno);
  servidor.use(...entorno.emulador.handlers());
  return entorno;
};

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  servidor.resetHandlers();
  const abiertos = entornos;
  entornos = [];
  await Promise.all(abiertos.map((entorno) => entorno.cerrar()));
});
afterAll(() => servidor.close());

const ID = '00000000-0000-4000-8000-00000000000a';

/** El servicio ya existe en SharePoint y esta copia lo editó localmente. */
const prepararEdicionLocal = async (
  entorno: EntornoSync,
  campos: Partial<Servicio>,
  sucios: Servicio['camposSucios'],
  /** Campos que además ya existen en SharePoint (la copia base los trae). */
  extraRemoto: Partial<Servicio> = {}
): Promise<void> => {
  const base = {
    ...servicioBuilder().conId(ID).diagnosticado().sincronizado().construir(),
    ...extraRemoto,
  };
  const item = entorno.emulador.sembrarServicio(aCamposSP(base));
  await entorno.servicios.guardar({
    ...base,
    ...campos,
    camposSucios: sucios,
    syncState: 'pending',
    sp: { itemId: item.id, eTag: item.eTag, modificadoEn: item.modificadoEn, webUrl: item.webUrl },
  });
};

const remoto = (entorno: EntornoSync): Record<string, unknown> =>
  entorno.emulador.itemsDe('Servicios')[0]?.fields ?? {};

describe('412 en el push (FR-006-07)', () => {
  it('si no hay choque combina y reintenta la subida en la misma sincronización', async () => {
    const entorno = await crear();
    await prepararEdicionLocal(entorno, { referencia: 'MI-REF' }, ['referencia']);
    // Otra persona cambia otro campo: el eTag guardado ya no sirve.
    entorno.emulador.modificarRemoto(ID, { Marca: 'TROJAN' });

    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, conflictos: 0, errores: 0, resultado: 'OK' });
    expect(remoto(entorno)).toMatchObject({ Referencia: 'MI-REF', Marca: 'TROJAN' });
    const local = await entorno.servicios.obtener(ID);
    expect(local).toMatchObject({
      syncState: 'synced',
      marca: 'TROJAN',
      referencia: 'MI-REF',
      camposSucios: [],
    });
  });

  it('si otra persona vació un campo que no tocamos, lo quita al combinar y sube lo nuestro', async () => {
    const entorno = await crear();
    await prepararEdicionLocal(entorno, { referencia: 'MI-REF' }, ['referencia'], {
      otDetalle: 'Detalle previo',
    });
    entorno.emulador.modificarRemoto(ID, { OTDetalle: undefined });

    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, conflictos: 0, errores: 0, resultado: 'OK' });
    expect(remoto(entorno)).toMatchObject({ Referencia: 'MI-REF' });
    const local = await entorno.servicios.obtener(ID);
    expect(local && 'otDetalle' in local).toBe(false);
    expect(local).toMatchObject({ syncState: 'synced', referencia: 'MI-REF', camposSucios: [] });
  });

  it('si otra persona vació un dato que el estado exige, queda en conflicto de estado para revisarlo', async () => {
    const entorno = await crear();
    await prepararEdicionLocal(entorno, { referencia: 'MI-REF' }, ['referencia']);
    entorno.emulador.modificarRemoto(ID, { ObservacionTecnica: undefined });

    const resumen = await entorno.sincronizar();

    expect(resumen.conflictos).toBe(1);
    expect((await entorno.servicios.obtener(ID))?.conflictos).toEqual([
      { campo: 'estado', local: 'DIAGNOSTICADO', remoto: 'DIAGNOSTICADO' },
    ]);
  });

  it('si otra persona vació un campo que editamos, es un conflicto con SharePoint vacío', async () => {
    const entorno = await crear();
    await prepararEdicionLocal(entorno, { observacionTecnica: 'MÍA' }, ['observacionTecnica']);
    entorno.emulador.modificarRemoto(ID, { ObservacionTecnica: undefined });

    const resumen = await entorno.sincronizar();

    expect(resumen.conflictos).toBe(1);
    const local = await entorno.servicios.obtener(ID);
    expect(local).toMatchObject({ syncState: 'conflict', observacionTecnica: 'MÍA' });
    expect(local?.conflictos).toEqual([
      { campo: 'observacionTecnica', local: 'MÍA', remoto: undefined },
    ]);
  });

  it('si hay choque deja el servicio en conflicto y no sube ese campo', async () => {
    const entorno = await crear();
    await prepararEdicionLocal(entorno, { observacionTecnica: 'MÍA' }, ['observacionTecnica']);
    entorno.emulador.modificarRemoto(ID, { ObservacionTecnica: 'REMOTA' });

    const resumen = await entorno.sincronizar();

    expect(resumen.conflictos).toBe(1);
    expect(remoto(entorno).ObservacionTecnica).toBe('REMOTA');
    const local = await entorno.servicios.obtener(ID);
    expect(local?.syncState).toBe('conflict');
    expect(local?.observacionTecnica).toBe('MÍA');
    expect(local?.conflictos).toEqual([
      { campo: 'observacionTecnica', local: 'MÍA', remoto: 'REMOTA' },
    ]);
  });

  it('reintenta una sola vez: otro cambio remoto en medio no genera un ciclo', async () => {
    const entorno = await crear();
    await prepararEdicionLocal(entorno, { referencia: 'MI-REF' }, ['referencia']);
    entorno.emulador.modificarRemoto(ID, { Marca: 'TROJAN' });
    // Fuerza otro 412 en el reintento.
    entorno.emulador.etagMismatch();

    const resumen = await entorno.sincronizar();

    expect(resumen.errores).toBe(0);
    const parches = entorno.emulador
      .peticionesRealizadas()
      .filter((peticion) => peticion.metodo === 'PATCH');
    expect(parches.length).toBeLessThanOrEqual(2);
  });

  it('resolver el conflicto eligiendo mi valor lo sube en la siguiente sincronización (ES-006-09)', async () => {
    const entorno = await crear();
    await prepararEdicionLocal(entorno, { observacionTecnica: 'MÍA' }, ['observacionTecnica']);
    entorno.emulador.modificarRemoto(ID, { ObservacionTecnica: 'REMOTA' });
    await entorno.sincronizar();

    const resolver = crearResolverConflictos({
      servicios: entorno.servicios,
      clock: entorno.clock,
    });
    await resolver(ID, [{ campo: 'observacionTecnica', usar: 'LOCAL' }]);
    expect((await entorno.servicios.obtener(ID))?.syncState).toBe('pending');

    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, conflictos: 0 });
    expect(remoto(entorno).ObservacionTecnica).toBe('MÍA');
    expect(await entorno.servicios.obtener(ID)).toMatchObject({
      syncState: 'synced',
      conflictos: [],
    });
  });

  it('resolver eligiendo el valor de SharePoint no sube nada y queda sincronizado', async () => {
    const entorno = await crear();
    await prepararEdicionLocal(entorno, { observacionTecnica: 'MÍA' }, ['observacionTecnica']);
    entorno.emulador.modificarRemoto(ID, { ObservacionTecnica: 'REMOTA' });
    await entorno.sincronizar();

    const resolver = crearResolverConflictos({
      servicios: entorno.servicios,
      clock: entorno.clock,
    });
    await resolver(ID, [{ campo: 'observacionTecnica', usar: 'REMOTO' }]);

    expect(await entorno.servicios.obtener(ID)).toMatchObject({
      syncState: 'synced',
      observacionTecnica: 'REMOTA',
      camposSucios: [],
    });
    const resumen = await entorno.sincronizar();
    expect(resumen.subidos).toBe(0);
  });
});
