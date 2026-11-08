import { describe, it, expect, beforeEach } from 'vitest';
import type { AppDB } from '@/infrastructure/db/dexie';
import { Dexie } from 'dexie';
import { reintentarErrores } from '@/application/mantenimiento/reintentarErrores';

describe('application/mantenimiento - reintentarErrores', () => {
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

  it('reintentar servicios con error', async () => {
    await db.servicios.add({
      id: '1',
      codigo: 'SVC-001',
      ultimoError: 'Error de red',
    } as Record<string, unknown>);

    const resultado = await reintentarErrores(db);
    expect(resultado.retintentados).toContain('1');
    expect(resultado.totalProcesados).toBe(1);
  });

  it('limpia ultimoError y proximoIntentoEn', async () => {
    await db.servicios.add({
      id: '2',
      codigo: 'SVC-002',
      ultimoError: 'Error',
      proximoIntentoEn: new Date().toISOString(),
    } as Record<string, unknown>);

    await reintentarErrores(db);

    const svc = await db.servicios.get('2');
    expect(svc?.ultimoError).toBeUndefined();
    expect(svc?.proximoIntentoEn).toBeUndefined();
  });

  it('no reintentar servicios sin error', async () => {
    await db.servicios.add({
      id: '3',
      codigo: 'SVC-003',
      sincState: 'synced',
    } as Record<string, unknown>);

    const resultado = await reintentarErrores(db);
    expect(resultado.retintentados).toHaveLength(0);
  });

  it('procesa múltiples servicios', async () => {
    await db.servicios.bulkAdd([
      { id: '1', codigo: 'SVC-001', ultimoError: 'Error 1' } as Record<string, unknown>,
      { id: '2', codigo: 'SVC-002', ultimoError: 'Error 2' } as Record<string, unknown>,
      { id: '3', codigo: 'SVC-003' } as Record<string, unknown>,
    ]);

    const resultado = await reintentarErrores(db);
    expect(resultado.retintentados).toHaveLength(2);
    expect(resultado.totalProcesados).toBe(2);
  });
});
