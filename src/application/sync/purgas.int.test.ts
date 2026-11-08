import { describe, it, expect, beforeEach } from 'vitest';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import type { AppDB } from '@/infrastructure/db/dexie';
import type { Servicio, Adjunto } from '@/domain/servicio';
import { ejecutarPurgas } from './purgas';

describe('HU-009-2: Limpieza segura del espacio', () => {
  let db: AppDB;

  beforeEach(async () => {
    db = await crearDbPrueba();
  });

  it('solo purga tras resultado OK de sincronización', async () => {
    const hoy = new Date();
    const hace120Dias = new Date(hoy.getTime() - 120 * 24 * 60 * 60 * 1000);

    const servicio: Servicio = {
      id: 'srv-facturado',
      codigo: 'BAT-001-SN123',
      tipoEquipo: 'BATERIA',
      estado: 'FACTURADO',
      syncState: 'synced',
      capturadoPor: 'user@example.com',
      capturadoPorNombre: 'Usuario',
      creadoEn: hace120Dias.toISOString(),
      actualizadoEn: hace120Dias.toISOString(),
      dispositivoId: 'device-1',
      appVersion: '1.0.0',
      ultimaSincronizacion: hace120Dias.toISOString(),
    } as Servicio;

    const adjunto: Adjunto = {
      id: 'adj-1',
      servicioId: 'srv-facturado',
      tipo: 'FOTO_INGRESO',
      nombreArchivo: 'foto.jpg',
      mime: 'image/jpeg',
      tamanoBytes: 50000,
      sha256: 'abc123',
      capturadoEn: hace120Dias.toISOString(),
      capturadoPor: 'user@example.com',
      blob: new Blob(['imagen']),
      miniatura: new Blob(['thumb']),
      syncState: 'synced',
      sincronizadoEn: hace120Dias.toISOString(),
      eliminarRemoto: false,
    } as Adjunto;

    await db.servicios.add(servicio);
    await db.adjuntos.add(adjunto);

    // Ejecutar purgas
    const resultado = await ejecutarPurgas(db, 7, 3);

    // Verificar que se purgaron
    expect(resultado.serviciosPurgados).toContain('srv-facturado');
    expect(resultado.adjuntosPurgados).toContain('adj-1');
    expect(resultado.espacioLiberado).toBeGreaterThan(0);
  });

  it('no purga servicios con syncState !== "synced"', async () => {
    const hace120Dias = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);

    const servicioPending: Servicio = {
      id: 'srv-pending',
      codigo: 'BAT-002-SN456',
      tipoEquipo: 'BATERIA',
      estado: 'FACTURADO',
      syncState: 'pending',
      capturadoPor: 'user@example.com',
      capturadoPorNombre: 'Usuario',
      creadoEn: hace120Dias.toISOString(),
      actualizadoEn: hace120Dias.toISOString(),
      dispositivoId: 'device-1',
      appVersion: '1.0.0',
      ultimaSincronizacion: hace120Dias.toISOString(),
    } as Servicio;

    const servicioError: Servicio = {
      id: 'srv-error',
      codigo: 'BAT-003-SN789',
      tipoEquipo: 'BATERIA',
      estado: 'FACTURADO',
      syncState: 'error',
      capturadoPor: 'user@example.com',
      capturadoPorNombre: 'Usuario',
      creadoEn: hace120Dias.toISOString(),
      actualizadoEn: hace120Dias.toISOString(),
      dispositivoId: 'device-1',
      appVersion: '1.0.0',
      ultimaSincronizacion: hace120Dias.toISOString(),
    } as Servicio;

    await db.servicios.add(servicioPending);
    await db.servicios.add(servicioError);

    const resultado = await ejecutarPurgas(db, 7, 3);

    expect(resultado.serviciosPurgados).not.toContain('srv-pending');
    expect(resultado.serviciosPurgados).not.toContain('srv-error');
  });

  it('conserva miniatura pero libera blob original', async () => {
    const hace120Dias = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);

    const servicio: Servicio = {
      id: 'srv-purga-blob',
      codigo: 'BAT-001-SN123',
      tipoEquipo: 'BATERIA',
      estado: 'FACTURADO',
      syncState: 'synced',
      capturadoPor: 'user@example.com',
      capturadoPorNombre: 'Usuario',
      creadoEn: hace120Dias.toISOString(),
      actualizadoEn: hace120Dias.toISOString(),
      dispositivoId: 'device-1',
      appVersion: '1.0.0',
      ultimaSincronizacion: hace120Dias.toISOString(),
    } as Servicio;

    const adjunto: Adjunto = {
      id: 'adj-blob-test',
      servicioId: 'srv-purga-blob',
      tipo: 'FOTO_INGRESO',
      nombreArchivo: 'foto.jpg',
      mime: 'image/jpeg',
      tamanoBytes: 50000,
      sha256: 'abc123',
      capturadoEn: hace120Dias.toISOString(),
      capturadoPor: 'user@example.com',
      blob: new Blob(['imagen grande']),
      miniatura: new Blob(['thumbnail']),
      syncState: 'synced',
      sincronizadoEn: hace120Dias.toISOString(),
      eliminarRemoto: false,
    } as Adjunto;

    await db.servicios.add(servicio);
    await db.adjuntos.add(adjunto);

    await ejecutarPurgas(db, 7, 3);

    const adjuntoActualizado = await db.adjuntos.get('adj-blob-test');
    expect(adjuntoActualizado?.blob).toBeNull();
    expect(adjuntoActualizado?.miniatura).toBeDefined();
  });

  it('re-verifica syncState antes de borrar (evita carrera)', async () => {
    const hace120Dias = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);

    const servicio: Servicio = {
      id: 'srv-race',
      codigo: 'BAT-001-SN123',
      tipoEquipo: 'BATERIA',
      estado: 'FACTURADO',
      syncState: 'synced',
      capturadoPor: 'user@example.com',
      capturadoPorNombre: 'Usuario',
      creadoEn: hace120Dias.toISOString(),
      actualizadoEn: hace120Dias.toISOString(),
      dispositivoId: 'device-1',
      appVersion: '1.0.0',
      ultimaSincronizacion: hace120Dias.toISOString(),
    } as Servicio;

    await db.servicios.add(servicio);

    // Simular que alguien cambió el estado a 'pending' justo antes de borrar
    await db.servicios.update('srv-race', { syncState: 'pending' });

    const resultado = await ejecutarPurgas(db, 7, 3);

    // Aunque fue seleccionado inicialmente, re-verificación debe evitar la purga
    expect(resultado.serviciosPurgados).not.toContain('srv-race');

    // Verificar que el servicio sigue en la BD
    const servicio2 = await db.servicios.get('srv-race');
    expect(servicio2).toBeDefined();
  });
});
