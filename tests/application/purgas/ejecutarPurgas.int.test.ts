import { describe, it, expect, beforeEach } from 'vitest';
import type { AppDB } from '@/infrastructure/db/dexie';
import { Dexie } from 'dexie';
import { ejecutarPurgas } from '@/application/purgas/ejecutarPurgas';

describe('application/purgas - ejecutarPurgas', () => {
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

  it('no purga servicios con syncState !== synced', async () => {
    await db.servicios.add({
      id: '1',
      codigo: 'SVC-001',
      estado: 'FACTURADO',
      syncState: 'pending',
      ultimaSincronizacion: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    } as Record<string, unknown>);

    const resultado = await ejecutarPurgas(db);
    expect(resultado.serviciosPurgados).toHaveLength(0);
  });

  it('no purga servicios en estado abierto', async () => {
    await db.servicios.add({
      id: '2',
      codigo: 'SVC-002',
      estado: 'DIAGNOSTICADO',
      syncState: 'synced',
      ultimaSincronizacion: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    } as Record<string, unknown>);

    const resultado = await ejecutarPurgas(db);
    expect(resultado.serviciosPurgados).toHaveLength(0);
  });

  it('purga servicios cerrados sincronizados', async () => {
    const ahora = new Date();
    const hace4Meses = new Date(ahora.getTime() - 4 * 30 * 24 * 60 * 60 * 1000);

    await db.servicios.add({
      id: '3',
      codigo: 'SVC-003',
      estado: 'FACTURADO',
      syncState: 'synced',
      ultimaSincronizacion: hace4Meses.toISOString(),
    } as Record<string, unknown>);

    const resultado = await ejecutarPurgas(db);
    expect(resultado.serviciosPurgados).toContain('3');
  });

  it('no purga adjuntos de servicios con syncState !== synced', async () => {
    await db.servicios.add({
      id: '4',
      codigo: 'SVC-004',
      estado: 'FACTURADO',
      syncState: 'pending',
    } as Record<string, unknown>);

    const ahora = new Date();
    const hace8Dias = new Date(ahora.getTime() - 8 * 24 * 60 * 60 * 1000);

    await db.adjuntos.add({
      id: 'adj-1',
      servicioId: '4',
      tieneOriginal: true,
      ultimaSincronizacion: hace8Dias.toISOString(),
      tamaño: 1024 * 1024,
    } as Record<string, unknown>);

    const resultado = await ejecutarPurgas(db);
    expect(resultado.adjuntosPurgados).toHaveLength(0);
  });

  it('marca adjuntos para eliminación remota', async () => {
    await db.servicios.add({
      id: '5',
      codigo: 'SVC-005',
      estado: 'FACTURADO',
      syncState: 'synced',
    } as Record<string, unknown>);

    const ahora = new Date();
    const hace8Dias = new Date(ahora.getTime() - 8 * 24 * 60 * 60 * 1000);

    await db.adjuntos.add({
      id: 'adj-2',
      servicioId: '5',
      tieneOriginal: true,
      ultimaSincronizacion: hace8Dias.toISOString(),
      tamaño: 2 * 1024 * 1024,
    } as Record<string, unknown>);

    const resultado = await ejecutarPurgas(db);
    expect(resultado.adjuntosPurgados).toContain('adj-2');

    const adjuntoActualizado = await db.adjuntos.get('adj-2');
    expect(adjuntoActualizado?.eliminarRemoto).toBe(true);
  });

  it('calcula espacio liberado', async () => {
    const ahora = new Date();
    const hace4Meses = new Date(ahora.getTime() - 4 * 30 * 24 * 60 * 60 * 1000);

    await db.servicios.add({
      id: '6',
      codigo: 'SVC-006',
      estado: 'FACTURADO',
      syncState: 'synced',
      ultimaSincronizacion: hace4Meses.toISOString(),
    } as Record<string, unknown>);

    const resultado = await ejecutarPurgas(db);
    expect(resultado.espacioLiberado).toBeGreaterThan(0);
  });

  it('retorna timestamp válido', async () => {
    const resultado = await ejecutarPurgas(db);
    expect(resultado.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
