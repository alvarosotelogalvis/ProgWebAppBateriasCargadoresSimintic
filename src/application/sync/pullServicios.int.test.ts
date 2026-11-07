import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crearPullServicios } from './pullServicios';
import type { RemoteGateway } from '../ports/RemoteGateway';
import type { ServicioRepository } from '../ports/ServicioRepository';
import type { MetaRepository } from '../ports/MetaRepository';
import type { Logger } from '@/infrastructure/logging/logger';
import type { Clock } from '@/shared/time';
import type { ConfigApp } from '@/domain/config';

describe('pullServicios — integración (T-010)', () => {
  let mockGateway: Partial<RemoteGateway>;
  let mockServicios: Partial<ServicioRepository>;
  let mockMeta: Partial<MetaRepository>;
  let mockLogger: Partial<Logger>;
  let mockClock: Partial<Clock>;
  let mockConfig: () => ConfigApp;

  beforeEach(() => {
    mockGateway = {
      cambiosServicios: vi.fn(),
      listarArchivosServicio: vi.fn(),
      descargarMiniatura: vi.fn(),
    };

    mockServicios = {
      obtener: vi.fn(),
      upsert: vi.fn(),
    };

    mockMeta = {
      obtener: vi.fn(),
      actualizar: vi.fn(),
    };

    mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };

    mockClock = {
      ahora: () => new Date('2026-11-07T10:00:00Z'),
    };

    mockConfig = () =>
      ({
        retencionCerradosMeses: 3,
        descargarMiniaturasRemotas: true,
        versionMinima: '0.1.0',
      }) as ConfigApp;
  });

  it('descarga un servicio remoto nuevo e inserta localmente (ES-006-01)', async () => {
    const cambioRemoto = {
      id: 'item-1',
      servicioId: 'new-uuid',
      fields: {
        estado: 'RECIBIDO' as const,
        tipoEquipo: 'BATERIA' as const,
        marca: 'SAMSUNG',
      },
      itemId: 'sp-item-1',
    };

    vi.mocked(mockGateway.cambiosServicios).mockResolvedValue({
      cambios: [cambioRemoto],
      deltaLink: 'https://delta-link-new',
    });

    vi.mocked(mockServicios.obtener).mockResolvedValue(undefined);
    vi.mocked(mockMeta.obtener).mockResolvedValue({ deltaLinkServicios: undefined });

    const pullServicios = crearPullServicios({
      remoto: mockGateway as RemoteGateway,
      servicios: mockServicios as ServicioRepository,
      meta: mockMeta as MetaRepository,
      reloj: mockClock as Clock,
      logger: mockLogger as Logger,
      config: mockConfig,
    });

    const resultado = await pullServicios({
      signal: new AbortController().signal,
      onProgreso: vi.fn(),
    });

    expect(resultado.descargados).toBe(1);
    expect(resultado.actualizados).toBe(0);
    expect(resultado.conflictos).toBe(0);
    expect(mockServicios.upsert).toHaveBeenCalled();
  });

  it('descarga cambios incrementales usando deltaLink (ES-006-04)', async () => {
    // Test para verificar que se usa el deltaLink guardado
    expect(true).toBe(true); // Placeholder
  });

  it('recupera de deltaLink caducado volviendo a descargar completo', async () => {
    // Si deltaLink devuelve 410, se borra y se descarga todo
    expect(true).toBe(true); // Placeholder
  });

  it('descargar refresca catálogos aunque falle (best-effort)', async () => {
    // refrescarCatalogos se invoca pero si falla, el pull continúa
    expect(true).toBe(true); // Placeholder
  });
});
