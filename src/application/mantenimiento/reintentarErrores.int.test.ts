import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AppDB } from '@/infrastructure/db/dexie';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { reintentarErrores } from './reintentarErrores';

let db: AppDB;

beforeEach(async () => {
  db = await crearDbPrueba();
});

afterEach(async () => {
  await db.delete();
});

describe('reintentarErrores (ES-009-16)', () => {
  it('devuelve a la cola los servicios en error y reinicia el backoff', async () => {
    await db.servicios.add({
      ...servicioBuilder().conId('e1').construir(),
      syncState: 'error',
      intentos: 5,
      proximoIntentoEn: '2999-01-01T00:00:00.000Z',
      ultimoError: { codigo: 'red', mensaje: 'sin red', fecha: '2026-11-16T00:00:00.000Z' },
    } as never);

    const resultado = await reintentarErrores(db);

    expect(resultado.reintentados).toEqual(['e1']);
    const guardado = await db.servicios.get('e1');
    expect(guardado?.syncState).toBe('pending');
    expect(guardado?.intentos).toBe(0);
    expect(guardado?.proximoIntentoEn).toBeUndefined();
    expect(guardado?.ultimoError).toBeUndefined();
  });

  it('no toca servicios sincronizados, pendientes ni en conflicto', async () => {
    await db.servicios.bulkAdd([
      { ...servicioBuilder().conId('a').construir(), syncState: 'synced' },
      { ...servicioBuilder().conId('b').construir(), syncState: 'pending' },
      { ...servicioBuilder().conId('c').construir(), syncState: 'conflict' },
    ]);

    const resultado = await reintentarErrores(db);

    expect(resultado.reintentados).toEqual([]);
    expect((await db.servicios.get('c'))?.syncState).toBe('conflict');
    expect((await db.servicios.get('a'))?.syncState).toBe('synced');
  });
});
