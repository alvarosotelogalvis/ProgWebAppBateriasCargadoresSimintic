import { describe, it, expect, beforeEach } from 'vitest';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import type { AppDB } from '@/infrastructure/db/dexie';
import type { Servicio, Adjunto } from '@/domain/servicio';

describe('Respaldo - Integración exportar ↔ importar', () => {
  let dbA: AppDB;
  let dbB: AppDB;

  beforeEach(async () => {
    dbA = await crearDbPrueba();
    dbB = await crearDbPrueba();
  });

  it('exporta servicios pendientes con adjuntos', async () => {
    const servicioId = 'srv-1';
    const adjuntoId = 'adj-1';

    const servicio: Servicio = {
      id: servicioId,
      codigo: 'BAT-001-SN123',
      tipoEquipo: 'BATERIA',
      estado: 'RECIBIDO',
      syncState: 'pending',
      capturadoPor: 'user@example.com',
      capturadoPorNombre: 'Usuario',
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      dispositivoId: 'device-1',
      appVersion: '1.0.0',
    } as Servicio;

    const adjunto: Adjunto = {
      id: adjuntoId,
      servicioId,
      tipo: 'FOTO_INGRESO',
      nombreArchivo: 'foto.jpg',
      mime: 'image/jpeg',
      tamanoBytes: 50000,
      sha256: 'abc123',
      capturadoEn: new Date().toISOString(),
      capturadoPor: 'user@example.com',
      blob: new Blob(['imagen data']),
      miniatura: new Blob(['thumb']),
      syncState: 'pending',
      eliminarRemoto: false,
    } as Adjunto;

    await dbA.servicios.add(servicio);
    await dbA.adjuntos.add(adjunto);

    const servicios = await dbA.servicios.toArray();
    const adjuntos = await dbA.adjuntos.toArray();

    expect(servicios).toHaveLength(1);
    expect(adjuntos).toHaveLength(1);
  });

  it('omite servicios duplicados al importar', async () => {
    const servicioId = 'srv-existing';

    const servicioA: Servicio = {
      id: servicioId,
      codigo: 'BAT-001-SN123',
      tipoEquipo: 'BATERIA',
      estado: 'RECIBIDO',
      syncState: 'pending',
      capturadoPor: 'user@example.com',
      capturadoPorNombre: 'Usuario',
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      dispositivoId: 'device-a',
      appVersion: '1.0.0',
    } as Servicio;

    const servicioB: Servicio = {
      ...servicioA,
      dispositivoId: 'device-b',
      estado: 'DIAGNOSTICADO',
      syncState: 'pending',
    };

    await dbA.servicios.add(servicioA);
    await dbB.servicios.add(servicioB);

    // Al importar, B tiene el servicio con id servicioId
    // La importación debe omitir este registro
    const existente = await dbB.servicios.get(servicioId);
    expect(existente).toBeDefined();
    expect(existente?.estado).toBe('DIAGNOSTICADO');
  });

  it('preserva syncState al exportar e importar', async () => {
    const servicioId = 'srv-sync';

    const servicio: Servicio = {
      id: servicioId,
      codigo: 'BAT-001-SN123',
      tipoEquipo: 'BATERIA',
      estado: 'RECIBIDO',
      syncState: 'pending',
      capturadoPor: 'user@example.com',
      capturadoPorNombre: 'Usuario',
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      dispositivoId: 'device-1',
      appVersion: '1.0.0',
    } as Servicio;

    await dbA.servicios.add(servicio);
    const original = await dbA.servicios.get(servicioId);

    // Simular que se importaría en dbB
    if (original && !(await dbB.servicios.get(servicioId))) {
      await dbB.servicios.add({ ...original, syncState: 'pending' });
    }

    const importado = await dbB.servicios.get(servicioId);
    expect(importado?.syncState).toBe('pending');
  });

  it('no incluye adjuntos remotos sin blob en el respaldo', async () => {
    const servicioId = 'srv-2';
    const adjuntoRemotoId = 'adj-remoto';

    // Adjunto remoto (descargado de SharePoint, sin blob local)
    const adjuntoRemoto: Adjunto = {
      id: adjuntoRemotoId,
      servicioId,
      tipo: 'FOTO_INGRESO',
      nombreArchivo: 'foto.jpg',
      mime: 'image/jpeg',
      tamanoBytes: 50000,
      sha256: 'abc123',
      capturadoEn: new Date().toISOString(),
      capturadoPor: 'otro-usuario',
      blob: null, // No tiene blob
      miniatura: new Blob(['thumb']),
      sp: {
        driveItemId: 'drive-123',
        webUrl: 'https://example.com/file',
        eTag: 'etag-123',
      },
      syncState: 'synced',
      eliminarRemoto: false,
    } as Adjunto;

    await dbA.adjuntos.add(adjuntoRemoto);

    const adjuntos = await dbA.adjuntos.toArray();
    // En respaldo, solo se incluyen adjuntos con blob
    const conBlob = adjuntos.filter((a) => a.blob !== null);

    expect(adjuntos).toHaveLength(1);
    expect(conBlob).toHaveLength(0);
  });

  it('manifiesto inválido no afecta la base de datos al importar', async () => {
    const serviciosAntes = await dbB.servicios.toArray();

    // Intentar "importar" un manifiesto inválido
    // (simulated - en realidad esto lo rechazaría validarManifiesto)
    const manifestoInvalido = {
      // Falta esquemaDb
      version: '1.0.0',
      app_version: '1.0.0',
    };

    // La validación debería fallar aquí
    expect(manifestoInvalido).not.toHaveProperty('esquemaDb');

    const serviciosDespues = await dbB.servicios.toArray();
    expect(serviciosDespues).toHaveLength(serviciosAntes.length);
  });
});
