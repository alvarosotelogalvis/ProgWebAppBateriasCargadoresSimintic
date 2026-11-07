import { describe, it, expect, beforeEach } from 'vitest';
import { corregirCampos } from './corregirCampos';
import type { AppDatabase } from '@/infrastructure/db/AppDatabase';
import { createAppDatabase } from '@/infrastructure/db/AppDatabase';
import { servicioBuilder } from '../../../tests/fixtures/builders';

describe('T036: corregirCampos (HU-007-8)', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = await createAppDatabase(':memory:');
  });

  it('debe permitir Admin corregir campos sin cambiar el estado', async () => {
    const servicio = servicioBuilder().withEstado('FACTURADO').withFacturaNumero('FE-001').build();
    await db.servicios.add(servicio);

    const resultado = await corregirCampos(
      servicio.id,
      { facturaNumero: 'FE-002' },
      'Administrador',
      db
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.servicio.facturaNumero).toBe('FE-002');
      expect(resultado.servicio.estado).toBe('FACTURADO');
      expect(resultado.servicio.syncState).toBe('pending');
    }
  });

  it('debe rechazar si no es Administrador', async () => {
    const servicio = servicioBuilder().withEstado('FACTURADO').build();
    await db.servicios.add(servicio);

    const resultado = await corregirCampos(
      servicio.id,
      { facturaNumero: 'FE-001' },
      'Comercial',
      db
    );

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toBe('SIN_PERMISO');
    }
  });

  it('debe marcar campos como sucios en syncState', async () => {
    const servicio = servicioBuilder()
      .withEstado('DIAGNOSTICADO')
      .withObservacionTecnica('Vieja')
      .build();
    await db.servicios.add(servicio);

    const resultado = await corregirCampos(
      servicio.id,
      { observacionTecnica: 'Nueva' },
      'Administrador',
      db
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.servicio.syncState).toBe('pending');
    }
  });

  it('debe rechazar si el servicio no existe', async () => {
    const resultado = await corregirCampos(
      'id-no-existe',
      { facturaNumero: 'FE-001' },
      'Administrador',
      db
    );

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toBe('NO_ENCONTRADO');
    }
  });

  it('debe permitir corregir en estados finales sin reabrirlos', async () => {
    const servicio = servicioBuilder()
      .withEstado('DISPOSICION_FINAL')
      .withObservacionTecnica('Texto anterior')
      .build();
    await db.servicios.add(servicio);

    const resultado = await corregirCampos(
      servicio.id,
      { observacionTecnica: 'Texto corregido' },
      'Administrador',
      db
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.servicio.estado).toBe('DISPOSICION_FINAL');
      expect(resultado.servicio.observacionTecnica).toBe('Texto corregido');
    }
  });
});
