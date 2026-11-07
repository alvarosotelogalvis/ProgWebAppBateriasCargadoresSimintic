import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { CatalogoRepositoryDexie } from './catalogoRepository';
import type { AppDB } from './dexie';
import { CLAVE_DISPOSITIVO_ID, MetaRepositoryDexie } from './metaRepository';

let db: AppDB;

beforeEach(async () => {
  db = await crearDbPrueba();
});

afterEach(async () => {
  await db.delete();
});

describe('MetaRepositoryDexie', () => {
  it('genera el dispositivoId una sola vez y lo reutiliza', async () => {
    const ids = new FakeIdGenerator();
    ids.predefinir(['disp-1', 'disp-2']);
    const repo = new MetaRepositoryDexie(db, ids);

    expect(await repo.dispositivoId()).toBe('disp-1');
    expect(await repo.dispositivoId()).toBe('disp-1');
    expect(await repo.obtener(CLAVE_DISPOSITIVO_ID)).toBe('disp-1');
  });

  it('guarda y recupera valores genéricos, incluido null', async () => {
    const repo = new MetaRepositoryDexie(db, new FakeIdGenerator());
    await repo.guardar('ultimaSync', '2026-10-21T08:00:00.000Z');
    await repo.guardar('nulo', null);

    expect(await repo.obtener<string>('ultimaSync')).toBe('2026-10-21T08:00:00.000Z');
    expect(await repo.obtener('nulo')).toBeNull();
    expect(await repo.obtener('no-existe')).toBeUndefined();
  });
});

describe('CatalogoRepositoryDexie', () => {
  it('guarda y recupera catálogos con marca de actualización', async () => {
    const repo = new CatalogoRepositoryDexie(db);
    await repo.guardar('diagnosticos', ['BATERIA DESGASTADA', 'D. FINAL']);

    expect(await repo.obtener<string[]>('diagnosticos')).toEqual([
      'BATERIA DESGASTADA',
      'D. FINAL',
    ]);
    expect(await repo.obtener('no-existe')).toBeUndefined();

    const registro = await db.catalogos.get('diagnosticos');
    expect(registro?.actualizadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
