import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolverConflicto412 } from './resolverConflicto412';
import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { Clock } from '@/application/ports/clock';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';

describe('resolverConflicto412 — conflicto 412 en el push (T-015)', () => {
  let mockGateway: Partial<RemoteGateway>;
  let mockServicios: Partial<ServicioRepository>;
  let mockLogger: Partial<Logger>;
  let mockClock: Partial<Clock>;

  beforeEach(() => {
    mockGateway = {
      cambiosServicios: vi.fn(),
    };

    mockServicios = {
      obtener: vi.fn(),
      guardar: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockClock = {
      ahoraIso: () => '2026-11-07T10:00:00Z',
      ahoraMs: () => new Date('2026-11-07T10:00:00Z').getTime(),
      fechaHoyIso: () => '2026-11-07',
    };
  });

  it('reintenta el PATCH sin choque cuando obtiene el remoto más reciente (ES-006-07)', async () => {
    // Escenario: el usuario envía PATCH con eTag viejo, hay 412, obtenemos remoto con eTag nuevo
    // Hacemos merge a 3 vías: no hay choque. Resultado: "reintentar" con nuevo eTag
    const local = servicioBuilder({
      id: 'svc-1',
      estado: 'DIAGNOSTICADO',
      observacionTecnica: 'Cambio local',
      camposSucios: ['observacionTecnica'],
      sp: {
        itemId: 'item-1',
        eTag: 'etag-viejo',
        modificadoEn: '2026-11-07T09:00:00Z',
        webUrl: 'https://sp/items/1',
      },
    });

    const remoteMasReciente = {
      id: 'item-1',
      servicioId: 'svc-1',
      fields: {
        estado: 'DIAGNOSTICADO',
        observacionTecnica: 'Comentario anterior',
        diagnostico: 'Batería descargada',
      },
      itemId: 'item-1',
      modified: '2026-11-07T09:30:00Z',
      editor: 'otro-usuario',
      editorNombre: 'Otro Usuario',
    };

    vi.spyOn(mockGateway, 'cambiosServicios').mockResolvedValue({
      cambios: [remoteMasReciente],
    });

    const resolver = resolverConflicto412({
      remoto: mockGateway as RemoteGateway,
      servicios: mockServicios as ServicioRepository,
      logger: mockLogger as Logger,
      reloj: mockClock as Clock,
    });

    const resultado = await resolver(local);

    expect(resultado.tipo).toBe('reintentar');
    if (resultado.tipo === 'reintentar') {
      expect(resultado.nuevoETag).toBe('etag-nuevo');
      expect(resultado.servicio.sp?.eTag).toBe('etag-nuevo');
    }
  });

  it('crea conflicto cuando el merge a 3 vías tiene choque (ES-006-08)', async () => {
    // Escenario: ambos cambiaron el mismo campo (observacionTecnica)
    // Resultado: conflicto, syncState='conflict'
    const local = servicioBuilder({
      id: 'svc-1',
      estado: 'DIAGNOSTICADO',
      observacionTecnica: 'Cambio local EN 10:00',
      camposSucios: ['observacionTecnica'],
      sp: {
        itemId: 'item-1',
        eTag: 'etag-viejo',
        modificadoEn: '2026-11-07T09:00:00Z',
        webUrl: 'https://sp/items/1',
      },
    });

    const remoteMasReciente = {
      id: 'item-1',
      servicioId: 'svc-1',
      fields: {
        estado: 'DIAGNOSTICADO',
        observacionTecnica: 'Cambio remoto EN 09:30',
        diagnostico: 'Batería descargada',
      },
      itemId: 'item-1',
      modified: '2026-11-07T09:30:00Z',
      editor: 'otro-usuario',
      editorNombre: 'Otro Usuario',
    };

    vi.spyOn(mockGateway, 'cambiosServicios').mockResolvedValue({
      cambios: [remoteMasReciente],
    });

    const resolver = resolverConflicto412({
      remoto: mockGateway as RemoteGateway,
      servicios: mockServicios as ServicioRepository,
      logger: mockLogger as Logger,
      reloj: mockClock as Clock,
    });

    const resultado = await resolver(local);

    expect(resultado.tipo).toBe('conflicto');
    if (resultado.tipo === 'conflicto') {
      expect(resultado.servicio.syncState).toBe('conflict');
      expect(resultado.servicio.conflictos.length).toBeGreaterThan(0);
    }
  });
});
