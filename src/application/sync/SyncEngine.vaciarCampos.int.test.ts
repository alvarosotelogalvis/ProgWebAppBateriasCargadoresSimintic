// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { Servicio } from '@/domain/servicio';
import { aCamposSP } from '@/infrastructure/graph/mappers/servicioMapper';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearEntornoSync, type EntornoSync } from '../../../tests/fixtures/sync/crearEntornoSync';

const servidor = setupServer();
let entornos: EntornoSync[] = [];

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  servidor.resetHandlers();
  const abiertos = entornos;
  entornos = [];
  await Promise.all(abiertos.map((entorno) => entorno.cerrar()));
});
afterAll(() => servidor.close());

const ID = '00000000-0000-4000-8000-00000000000a';

describe('sincronizar un campo que se vació', () => {
  it('lo borra en SharePoint (null) y deja el servicio sincronizado, sin pendientes eternos', async () => {
    const entorno = await crearEntornoSync();
    entornos.push(entorno);
    servidor.use(...entorno.emulador.handlers());

    const completo = servicioBuilder().conId(ID).facturado().sincronizado().construir();
    const item = entorno.emulador.sembrarServicio(aCamposSP(completo));
    expect(item.fields.FacturaNumero).toBe('FV-100');

    // Localmente se vació el número de factura (p. ej. corrección del administrador).
    const { facturaNumero: _vaciado, ...sinNumero } = completo;
    const local: Servicio = {
      ...sinNumero,
      camposSucios: ['facturaNumero'],
      syncState: 'pending',
      sp: { itemId: item.id, eTag: item.eTag, modificadoEn: '', webUrl: '' },
    };
    await entorno.servicios.guardar(local);

    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, errores: 0, resultado: 'OK' });
    expect(entorno.emulador.itemsDe('Servicios')[0]?.fields.FacturaNumero).toBeNull();
    const guardado = await entorno.servicios.obtener(ID);
    expect(guardado).toMatchObject({ syncState: 'synced', camposSucios: [] });
    expect('facturaNumero' in (guardado?.base ?? {})).toBe(false);

    // Una segunda sincronización no tiene nada que subir.
    expect((await entorno.sincronizar()).subidos).toBe(0);
  });

  it('un campo nuevo sin valor no envía nulos en la creación', async () => {
    const entorno = await crearEntornoSync();
    entornos.push(entorno);
    servidor.use(...entorno.emulador.handlers());
    await entorno.servicios.guardar(servicioBuilder().conId(ID).recibido().pendiente().construir());

    await entorno.sincronizar();

    const campos = entorno.emulador.itemsDe('Servicios')[0]?.fields ?? {};
    expect(Object.values(campos)).not.toContain(null);
  });
});
