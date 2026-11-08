import { describe, it, expect, beforeEach } from 'vitest';
import type { AppDB } from '@/infrastructure/db/dexie';
import { Dexie } from 'dexie';
import { restablecerApp, ErrorRestablecimiento } from '@/application/mantenimiento/restablecerApp';

describe('application/mantenimiento - restablecerApp', () => {
  let db: AppDB;

  beforeEach(() => {
    db = new Dexie('test-db') as AppDB;
    db.version(1).stores({
      servicios: 'id',
      adjuntos: 'id, servicioId',
      logs: 'seq, evento',
      catalogos: 'nombre',
    });
  });

  it('rechaza si hay servicios pendientes', async () => {
    await db.servicios.add({
      id: '1',
      codigo: 'SVC-001',
      syncState: 'pending',
    } as Record<string, unknown>);

    await expect(restablecerApp(db)).rejects.toThrow(ErrorRestablecimiento);
  });

  it('elimina todos los datos si no hay pendientes', async () => {
    await db.servicios.bulkAdd([
      { id: '1', codigo: 'SVC-001', syncState: 'synced' } as Record<string, unknown>,
      { id: '2', codigo: 'SVC-002', syncState: 'synced' } as Record<string, unknown>,
    ]);

    await db.adjuntos.add({
      id: 'adj-1',
      servicioId: '1',
    } as Record<string, unknown>);

    const resultado = await restablecerApp(db);

    expect(resultado.serviciosEliminados).toBe(2);
    expect(resultado.adjuntosEliminados).toBe(1);
    expect(await db.servicios.count()).toBe(0);
    expect(await db.adjuntos.count()).toBe(0);
  });

  it('retorna contadores correctos', async () => {
    await db.servicios.add({
      id: '1',
      codigo: 'SVC-001',
      syncState: 'synced',
    } as Record<string, unknown>);

    const resultado = await restablecerApp(db);

    expect(resultado.serviciosEliminados).toBe(1);
    expect(resultado.adjuntosEliminados).toBe(0);
    expect(resultado.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('no elimina si hay un solo pendiente', async () => {
    await db.servicios.bulkAdd([
      { id: '1', codigo: 'SVC-001', syncState: 'synced' } as Record<string, unknown>,
      { id: '2', codigo: 'SVC-002', syncState: 'pending' } as Record<string, unknown>,
    ]);

    await expect(restablecerApp(db)).rejects.toThrow();
    expect(await db.servicios.count()).toBe(2);
  });
});
