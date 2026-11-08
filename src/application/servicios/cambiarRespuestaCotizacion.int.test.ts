import { describe, it, expect, beforeEach } from 'vitest';
import { cambiarRespuestaCotizacion } from './cambiarRespuestaCotizacion';
import type { AppDatabase } from '@/infrastructure/db/AppDatabase';
import { createAppDatabase } from '@/infrastructure/db/AppDatabase';
import { servicioBuilder } from '../../../tests/fixtures/builders';

describe('T026: cambiarRespuestaCotizacion (HU-007-3)', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = await createAppDatabase(':memory:');
  });

  it('debe cambiar cotizacionEstado en COTIZADO solo con rol Comercial', async () => {
    const servicio = servicioBuilder()
      .withEstado('COTIZADO')
      .withCotizacionEstado('PENDIENTE')
      .build();
    await db.servicios.add(servicio);

    const resultado = await cambiarRespuestaCotizacion(servicio.id, 'APROBADA', 'Comercial', db);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.servicio.cotizacionEstado).toBe('APROBADA');
      expect(resultado.servicio.syncState).toBe('pending');
    }
  });

  it('debe rechazar si el estado no es COTIZADO', async () => {
    const servicio = servicioBuilder()
      .withEstado('DIAGNOSTICADO')
      .withCotizacionEstado('PENDIENTE')
      .build();
    await db.servicios.add(servicio);

    const resultado = await cambiarRespuestaCotizacion(servicio.id, 'APROBADA', 'Comercial', db);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toBe('NO_EN_COTIZADO');
    }
  });

  it('debe rechazar si no es Comercial ni Administrador', async () => {
    const servicio = servicioBuilder()
      .withEstado('COTIZADO')
      .withCotizacionEstado('PENDIENTE')
      .build();
    await db.servicios.add(servicio);

    const resultado = await cambiarRespuestaCotizacion(servicio.id, 'APROBADA', 'Tecnico', db);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toBe('SIN_PERMISO');
    }
  });

  it('debe permitir Administrador cambiar respuesta', async () => {
    const servicio = servicioBuilder()
      .withEstado('COTIZADO')
      .withCotizacionEstado('APROBADA')
      .build();
    await db.servicios.add(servicio);

    const resultado = await cambiarRespuestaCotizacion(
      servicio.id,
      'RECHAZADA',
      'Administrador',
      db
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.servicio.cotizacionEstado).toBe('RECHAZADA');
    }
  });

  it('debe rechazar si el servicio no existe', async () => {
    const resultado = await cambiarRespuestaCotizacion('id-no-existe', 'APROBADA', 'Comercial', db);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toBe('NO_ENCONTRADO');
    }
  });
});
