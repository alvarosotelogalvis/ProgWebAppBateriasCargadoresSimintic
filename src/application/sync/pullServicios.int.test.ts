// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CLAVES_CATALOGO, CLAVES_META } from '@/application/setup/claves';
import type { Servicio } from '@/domain/servicio';
import { aCamposSP } from '@/infrastructure/graph/mappers/servicioMapper';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { EmuladorGraph } from '../../../tests/fixtures/graph/emuladorGraph';
import {
  crearEntornoSync,
  type EntornoSync,
  type OpcionesEntornoSync,
} from '../../../tests/fixtures/sync/crearEntornoSync';

const servidor = setupServer();
let entornos: EntornoSync[] = [];

const crear = async (opciones?: OpcionesEntornoSync): Promise<EntornoSync> => {
  const entorno = await crearEntornoSync(opciones);
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

const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';

/** Servicio tal como lo dejaría otro dispositivo en SharePoint. */
const camposRemotos = (servicio: Servicio): Record<string, unknown> => aCamposSP(servicio);

const opciones = (): { signal: AbortSignal } => ({ signal: new AbortController().signal });

/** Copia local ya sincronizada con el ítem remoto indicado. */
const localSincronizado = (
  entorno: EntornoSync,
  servicio: Servicio,
  itemId: string
): Promise<void> =>
  entorno.servicios.guardar({
    ...servicio,
    sp: { itemId, eTag: '"viejo"', modificadoEn: '2026-10-01T00:00:00Z', webUrl: '' },
  });

describe('pullServicios', () => {
  it('descarga un servicio remoto nuevo como sincronizado, con el cliente del catálogo (ES-006-01)', async () => {
    const entorno = await crear();
    await entorno.catalogos.guardar(CLAVES_CATALOGO.clientes, [
      { id: 1, nombre: 'NAVAR ASOCIADOS', activo: true },
    ]);
    const remoto = servicioBuilder().conId(ID_A).diagnosticado().sincronizado().construir();
    const item = entorno.emulador.sembrarServicio(camposRemotos(remoto));

    const resultado = await entorno.pull(opciones());

    expect(resultado).toMatchObject({ descargados: 1, actualizados: 0, conflictos: 0 });
    expect(resultado.servicioIds).toEqual([ID_A]);
    const local = await entorno.servicios.obtener(ID_A);
    expect(local).toMatchObject({
      estado: 'DIAGNOSTICADO',
      syncState: 'synced',
      origen: 'remoto',
      clienteNombre: 'NAVAR ASOCIADOS',
      diagnostico: remoto.diagnostico,
      sp: { itemId: item.id, eTag: item.eTag },
    });
    expect(await entorno.meta.obtener(CLAVES_META.metodoPull)).toBe('completa');
  });

  it('en la siguiente descarga pide solo lo nuevo (ES-006-04)', async () => {
    const entorno = await crear();
    entorno.emulador.sembrarServicio(
      camposRemotos(servicioBuilder().conId(ID_A).recibido().sincronizado().construir())
    );
    await entorno.pull(opciones());
    expect(await entorno.meta.obtener<string>(CLAVES_META.deltaLinkServicios)).toContain('token=');

    const sinCambios = await entorno.pull(opciones());
    expect(sinCambios).toMatchObject({ descargados: 0, actualizados: 0 });
    expect(await entorno.meta.obtener(CLAVES_META.metodoPull)).toBe('delta');

    entorno.emulador.sembrarServicio(
      camposRemotos(servicioBuilder().conId(ID_B).recibido().sincronizado().construir())
    );
    const conNuevo = await entorno.pull(opciones());
    expect(conNuevo.servicioIds).toEqual([ID_B]);
  });

  it('sobrescribe la copia local sin cambios pendientes (ES-006-03)', async () => {
    const entorno = await crear();
    const base = servicioBuilder().conId(ID_A).recibido().sincronizado().construir();
    const item = entorno.emulador.sembrarServicio(camposRemotos(base));
    await localSincronizado(entorno, base, item.id);

    entorno.emulador.modificarRemoto(ID_A, { Marca: 'TROJAN' });
    const resultado = await entorno.pull(opciones());

    expect(resultado.actualizados).toBe(1);
    const local = await entorno.servicios.obtener(ID_A);
    expect(local?.marca).toBe('TROJAN');
    expect(local?.syncState).toBe('synced');
    expect(local?.sp?.eTag).not.toBe('"viejo"');
  });

  it('un servicio descargado por delta se puede editar y enviar: el eTag del delta (sin comillas) no debe romper el If-Match', async () => {
    const entorno = await crear();
    const base = servicioBuilder().conId(ID_A).diagnosticado().sincronizado().construir();
    entorno.emulador.sembrarServicio(camposRemotos(base));
    entorno.emulador.modificarRemoto(ID_A, { Marca: 'TROJAN' });
    await entorno.pull(opciones());
    const descargado = await entorno.servicios.obtener(ID_A);
    expect(descargado?.sp?.eTag.startsWith('"')).toBe(true); // normalizado a la forma con comillas

    await entorno.servicios.guardar({
      ...descargado!,
      observacionTecnica: 'Editada en el dispositivo tras descargar',
      camposSucios: ['observacionTecnica'],
      syncState: 'pending',
    });
    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, errores: 0, conflictos: 0 });
    expect(entorno.emulador.itemsDe('Servicios')[0]?.fields.ObservacionTecnica).toBe(
      'Editada en el dispositivo tras descargar'
    );
  });

  it.each([
    ['la columna llega en null', null],
    ['la columna se omite', undefined],
  ])('quita en el dispositivo un campo vaciado en SharePoint: %s', async (_caso, vacio) => {
    const entorno = await crear();
    const base = servicioBuilder().conId(ID_A).facturado().sincronizado().construir();
    const item = entorno.emulador.sembrarServicio(camposRemotos(base));
    await localSincronizado(entorno, base, item.id);
    expect(base.facturaNumero).toBeDefined();

    entorno.emulador.modificarRemoto(ID_A, { FacturaNumero: vacio });
    const resultado = await entorno.pull(opciones());

    expect(resultado.actualizados).toBe(1);
    const local = await entorno.servicios.obtener(ID_A);
    expect(local && 'facturaNumero' in local).toBe(false);
    expect(local).toMatchObject({ syncState: 'synced', camposSucios: [] });
    expect(local?.facturaFecha).toBe(base.facturaFecha);
  });

  it('conserva un campo local pendiente que SharePoint nunca tuvo, sin conflicto', async () => {
    const entorno = await crear();
    const base = servicioBuilder().conId(ID_A).recibido().sincronizado().construir();
    const item = entorno.emulador.sembrarServicio(camposRemotos(base));
    await entorno.servicios.guardar({
      ...base,
      observacionTecnica: 'NUEVA',
      camposSucios: ['observacionTecnica'],
      syncState: 'pending',
      sp: { itemId: item.id, eTag: item.eTag, modificadoEn: '', webUrl: '' },
    });

    entorno.emulador.modificarRemoto(ID_A, { Marca: 'TROJAN' });
    const resultado = await entorno.pull(opciones());

    expect(resultado.conflictos).toBe(0);
    const local = await entorno.servicios.obtener(ID_A);
    expect(local).toMatchObject({
      marca: 'TROJAN',
      observacionTecnica: 'NUEVA',
      camposSucios: ['observacionTecnica'],
    });
  });

  it('combina campos distintos sin pedir nada al usuario (ES-006-06)', async () => {
    const entorno = await crear();
    const base = servicioBuilder().conId(ID_A).recibido().sincronizado().construir();
    const item = entorno.emulador.sembrarServicio(camposRemotos(base));
    await entorno.servicios.guardar({
      ...base,
      referencia: 'MI-REFERENCIA',
      camposSucios: ['referencia'],
      syncState: 'pending',
      sp: { itemId: item.id, eTag: item.eTag, modificadoEn: '', webUrl: '' },
    });

    entorno.emulador.modificarRemoto(ID_A, { Marca: 'TROJAN' });
    const resultado = await entorno.pull(opciones());

    expect(resultado.conflictos).toBe(0);
    const local = await entorno.servicios.obtener(ID_A);
    expect(local).toMatchObject({
      marca: 'TROJAN',
      referencia: 'MI-REFERENCIA',
      syncState: 'pending',
      camposSucios: ['referencia'],
      conflictos: [],
    });
  });

  it('marca conflicto cuando ambos cambiaron el mismo campo y conserva el valor local (ES-006-07)', async () => {
    const entorno = await crear();
    const base = servicioBuilder().conId(ID_A).diagnosticado().sincronizado().construir();
    const item = entorno.emulador.sembrarServicio(camposRemotos(base));
    await entorno.servicios.guardar({
      ...base,
      observacionTecnica: 'Observación mía.',
      camposSucios: ['observacionTecnica'],
      syncState: 'pending',
      sp: { itemId: item.id, eTag: item.eTag, modificadoEn: '', webUrl: '' },
    });

    entorno.emulador.modificarRemoto(ID_A, { ObservacionTecnica: 'Observación de otra persona.' });
    const resultado = await entorno.pull(opciones());

    expect(resultado.conflictos).toBe(1);
    const local = await entorno.servicios.obtener(ID_A);
    expect(local?.syncState).toBe('conflict');
    expect(local?.observacionTecnica).toBe('Observación mía.');
    expect(local?.conflictos).toEqual([
      {
        campo: 'observacionTecnica',
        local: 'Observación mía.',
        remoto: 'Observación de otra persona.',
      },
    ]);
  });

  it('una segunda descarga no pisa un servicio en conflicto (ES-006-12)', async () => {
    const entorno = await crear();
    const base = servicioBuilder().conId(ID_A).diagnosticado().sincronizado().construir();
    const item = entorno.emulador.sembrarServicio(camposRemotos(base));
    await entorno.servicios.guardar({
      ...base,
      observacionTecnica: 'Mía.',
      camposSucios: ['observacionTecnica'],
      syncState: 'pending',
      sp: { itemId: item.id, eTag: item.eTag, modificadoEn: '', webUrl: '' },
    });
    entorno.emulador.modificarRemoto(ID_A, { ObservacionTecnica: 'Remota 1.' });
    await entorno.pull(opciones());

    entorno.emulador.modificarRemoto(ID_A, { ObservacionTecnica: 'Remota 2.' });
    await entorno.pull(opciones());

    const local = await entorno.servicios.obtener(ID_A);
    expect(local?.syncState).toBe('conflict');
    expect(local?.observacionTecnica).toBe('Mía.');
    expect(local?.conflictos[0]?.remoto).toBe('Remota 1.');
  });

  it('no descarga cerrados fuera de la retención pero sí los abiertos (ES-006-02)', async () => {
    const entorno = await crear();
    entorno.emulador.sembrarServicio(
      camposRemotos(servicioBuilder().conId(ID_A).facturado().sincronizado().construir())
    );
    entorno.emulador.sembrarServicio(
      camposRemotos(servicioBuilder().conId(ID_B).diagnosticado().sincronizado().construir())
    );
    // Seis meses después de la última edición de ambos ítems.
    entorno.clock.avanzarDias(180);

    const resultado = await entorno.pull(opciones());

    expect(resultado.servicioIds).toEqual([ID_B]);
    expect(await entorno.servicios.obtener(ID_A)).toBeUndefined();
  });

  it('si el deltaLink caducó (410) descarga todo de nuevo (FR-006-10)', async () => {
    const entorno = await crear();
    entorno.emulador.sembrarServicio(
      camposRemotos(servicioBuilder().conId(ID_A).recibido().sincronizado().construir())
    );
    await entorno.pull(opciones());
    entorno.emulador.sembrarServicio(
      camposRemotos(servicioBuilder().conId(ID_B).recibido().sincronizado().construir())
    );

    entorno.emulador.failNext(410);
    const resultado = await entorno.pull(opciones());

    expect(await entorno.meta.obtener(CLAVES_META.metodoPull)).toBe('completa');
    expect(resultado.servicioIds).toContain(ID_B);
    expect(await entorno.servicios.obtener(ID_B)).toBeDefined();
  });

  it('pagina el delta y reúne todos los cambios', async () => {
    const emulador = new EmuladorGraph({ tamanoPagina: 2 });
    const entorno = await crear({ emulador });
    for (let n = 1; n <= 5; n += 1) {
      const id = `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
      emulador.sembrarServicio(
        camposRemotos(servicioBuilder().conId(id).recibido().sincronizado().construir())
      );
    }

    const resultado = await entorno.pull(opciones());

    expect(resultado.descargados).toBe(5);
  });

  it('si la descarga se corta no avanza el deltaLink y la siguiente lo recupera todo', async () => {
    const entorno = await crear();
    entorno.emulador.sembrarServicio(
      camposRemotos(servicioBuilder().conId(ID_A).recibido().sincronizado().construir())
    );
    const controlador = new AbortController();
    controlador.abort();

    await expect(entorno.pull({ signal: controlador.signal })).rejects.toBeDefined();
    expect(await entorno.meta.obtener(CLAVES_META.deltaLinkServicios)).toBeUndefined();

    const resultado = await entorno.pull(opciones());
    expect(resultado.descargados).toBe(1);
  });

  it('repetir la misma descarga no duplica ni cambia nada (idempotente)', async () => {
    const entorno = await crear();
    entorno.emulador.sembrarServicio(
      camposRemotos(servicioBuilder().conId(ID_A).recibido().sincronizado().construir())
    );
    await entorno.pull(opciones());
    const primero = await entorno.servicios.obtener(ID_A);
    // Sin deltaLink guardado vuelve a recibir el mismo ítem.
    await entorno.meta.guardar(CLAVES_META.deltaLinkServicios, undefined);
    await entorno.pull(opciones());

    expect(await entorno.db.servicios.count()).toBe(1);
    expect(await entorno.servicios.obtener(ID_A)).toEqual(primero);
  });

  describe('eliminación remota', () => {
    it('borra la copia local sincronizada y sin cambios', async () => {
      const entorno = await crear();
      const base = servicioBuilder().conId(ID_A).recibido().sincronizado().construir();
      const item = entorno.emulador.sembrarServicio(camposRemotos(base));
      await localSincronizado(entorno, base, item.id);
      await entorno.pull(opciones());

      entorno.emulador.eliminarRemoto(ID_A);
      const resultado = await entorno.pull(opciones());

      expect(resultado.eliminados).toBe(1);
      expect(await entorno.servicios.obtener(ID_A)).toBeUndefined();
    });

    it('nunca borra una copia con cambios pendientes: queda en conflicto (FR-006-14)', async () => {
      const entorno = await crear();
      const base = servicioBuilder().conId(ID_A).recibido().sincronizado().construir();
      const item = entorno.emulador.sembrarServicio(camposRemotos(base));
      await entorno.servicios.guardar({
        ...base,
        marca: 'MÍA',
        camposSucios: ['marca'],
        syncState: 'pending',
        sp: { itemId: item.id, eTag: item.eTag, modificadoEn: '', webUrl: '' },
      });
      entorno.emulador.eliminarRemoto(ID_A);

      const resultado = await entorno.pull(opciones());

      expect(resultado).toMatchObject({ eliminados: 0, conflictos: 1 });
      const local = await entorno.servicios.obtener(ID_A);
      expect(local).toMatchObject({ syncState: 'conflict', marca: 'MÍA' });
    });
  });

  describe('dos dispositivos (ES-006-01 de punta a punta)', () => {
    it('A sube un servicio; B sincroniza y lo tiene completo, sin conexión', async () => {
      const emulador = new EmuladorGraph();
      const dispositivoA = await crear({ emulador });
      const dispositivoB = await crear({ emulador, conPull: true });

      await dispositivoA.servicios.guardar(
        servicioBuilder().conId(ID_A).diagnosticado().pendiente().construir()
      );
      const resumenA = await dispositivoA.sincronizar();
      expect(resumenA.resultado).toBe('OK');

      const resumenB = await dispositivoB.sincronizar();
      expect(resumenB.errores).toBe(0);

      const enB = await dispositivoB.servicios.obtener(ID_A);
      expect(enB).toMatchObject({
        estado: 'DIAGNOSTICADO',
        syncState: 'synced',
        origen: 'remoto',
        // El catálogo de clientes se refresca de SharePoint en la misma sincronización (FR-006-11).
        clienteNombre: 'Clientes Demo SAS',
      });
      expect(dispositivoB.logger.errores).toEqual([]);
    });
  });
});
