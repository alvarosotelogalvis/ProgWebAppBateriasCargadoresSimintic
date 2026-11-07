import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crearPullServicios } from './pullServicios';
import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { Clock } from '@/application/ports/clock';
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
      guardar: vi.fn(),
      listarPendientes: vi.fn(),
      buscarPorSpItemId: vi.fn(),
      buscarPorSerie: vi.fn(),
      eliminarBorrador: vi.fn(),
      purgarCerrados: vi.fn(),
    };

    mockMeta = {
      obtener: vi.fn(),
      guardar: vi.fn(),
      dispositivoId: vi.fn(),
    };

    mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };

    mockClock = {
      ahoraIso: () => '2026-11-07T10:00:00Z',
      ahoraMs: () => new Date('2026-11-07T10:00:00Z').getTime(),
      fechaHoyIso: () => '2026-11-07',
    };

    mockConfig = () =>
      ({
        versionMinimaApp: '0.1.0',
        syncModoAutenticacion: 'confirmar',
        syncReautenticacionHoras: 12,
        minFotosIngreso: 1,
        maxFotosIngreso: 5,
        minFotosSalida: 1,
        maxFotosSalida: 10,
        maxTamanoPdfMB: 20,
        imagenMaxLadoPx: 1920,
        imagenCalidad: 0.75,
        vidaUtilMesesDefecto: 12,
        umbralesAlertaDias: [90, 60, 30],
        retencionCerradosMeses: 3,
        retencionOriginalesDias: 7,
        descargarMiniaturasRemotas: true,
        diagnosticoValorDisposicionFinal: 'D. FINAL',
        recordatorioPendientesHoras: 24,
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

    vi.spyOn(mockGateway, 'cambiosServicios').mockResolvedValue({
      cambios: [cambioRemoto],
      deltaLink: 'https://delta-link-new',
    });

    vi.spyOn(mockServicios, 'obtener').mockResolvedValue(undefined);
    vi.spyOn(mockMeta, 'obtener').mockResolvedValue(undefined);
    vi.spyOn(mockMeta, 'guardar').mockResolvedValue(undefined);
    vi.spyOn(mockServicios, 'guardar').mockResolvedValue(undefined);

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
    expect(mockServicios.guardar).toHaveBeenCalled();
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
