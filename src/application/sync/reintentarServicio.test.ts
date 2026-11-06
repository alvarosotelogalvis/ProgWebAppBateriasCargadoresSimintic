import { afterEach, describe, expect, it } from 'vitest';

import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';

import { reintentarServicio } from './reintentarServicio';

const cerrar: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(cerrar.splice(0).map((fn) => fn()));
});

async function crearRepositorio() {
  const db = await crearDbPrueba();
  cerrar.push(() => db.delete());
  return new ServicioRepositoryDexie(db);
}

describe('reintentarServicio', () => {
  it('reinicia los intentos y lo devuelve a la cola (ES-005-17, ES-005-18)', async () => {
    const servicios = await crearRepositorio();
    const base = servicioBuilder().conId('s-1').pendiente().construir();
    await servicios.guardar({
      ...base,
      syncState: 'error',
      intentos: 8,
      proximoIntentoEn: '2026-11-06T12:00:00.000Z',
      ultimoError: { codigo: 'SP_SIN_PERMISO', mensaje: 'Sin permiso', en: '2026-11-06T10:00:00Z' },
    });

    await expect(reintentarServicio(servicios, 's-1')).resolves.toBe(true);

    const guardado = await servicios.obtener('s-1');
    expect(guardado).toMatchObject({ syncState: 'pending', intentos: 0 });
    expect(guardado?.proximoIntentoEn).toBeUndefined();
    expect(guardado?.ultimoError).toBeUndefined();
    expect(guardado?.camposSucios).toEqual(base.camposSucios);
  });

  it('no toca servicios que no están en error', async () => {
    const servicios = await crearRepositorio();
    const sincronizado = servicioBuilder().conId('s-2').sincronizado().construir();
    await servicios.guardar(sincronizado);

    await expect(reintentarServicio(servicios, 's-2')).resolves.toBe(false);
    await expect(reintentarServicio(servicios, 'no-existe')).resolves.toBe(false);
    expect(await servicios.obtener('s-2')).toEqual(sincronizado);
  });
});
