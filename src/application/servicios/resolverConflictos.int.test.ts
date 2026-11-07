import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crearResolverConflictos } from './resolverConflictos';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { Clock } from '@/application/ports/clock';
import { servicioBuilder } from '../../tests/builders/servicioBuilder';

describe('resolverConflictos — aplicar elecciones del usuario (T-016)', () => {
  let mockServicios: Partial<ServicioRepository>;
  let mockClock: Partial<Clock>;

  beforeEach(() => {
    mockServicios = {
      obtener: vi.fn(),
      guardar: vi.fn(),
    };

    mockClock = {
      ahoraIso: () => '2026-11-07T10:00:00Z',
      ahoraMs: () => new Date('2026-11-07T10:00:00Z').getTime(),
      fechaHoyIso: () => '2026-11-07',
    };
  });

  it('rechaza elecciones incompletas (ES-006-09)', async () => {
    const servicio = servicioBuilder({
      id: 'svc-1',
      conflictos: [
        { campo: 'observacionTecnica', local: 'Valor A', remoto: 'Valor B' },
        { campo: 'diagnostico', local: 'Diagnóstico A', remoto: 'Diagnóstico B' },
      ],
      syncState: 'conflict',
    });

    vi.spyOn(mockServicios, 'obtener').mockResolvedValue(servicio);

    const resolver = crearResolverConflictos({
      servicios: mockServicios as ServicioRepository,
      reloj: mockClock as Clock,
    });

    // Solo elige un campo de dos
    const elecciones = [{ campo: 'observacionTecnica' as const, usar: 'LOCAL' as const }];

    await expect(resolver('svc-1', elecciones)).rejects.toThrow('incompleta');
  });

  it('aplica LOCAL: deja el campo sucio para reintento (ES-006-10)', async () => {
    const servicio = servicioBuilder({
      id: 'svc-1',
      conflictos: [{ campo: 'observacionTecnica', local: 'Valor local', remoto: 'Valor remoto' }],
      syncState: 'conflict',
      base: { observacionTecnica: 'Valor anterior' },
    });

    vi.spyOn(mockServicios, 'obtener').mockResolvedValue(servicio);
    const guardarSpy = vi.spyOn(mockServicios, 'guardar');

    const resolver = crearResolverConflictos({
      servicios: mockServicios as ServicioRepository,
      reloj: mockClock as Clock,
    });

    const elecciones = [{ campo: 'observacionTecnica' as const, usar: 'LOCAL' as const }];

    await resolver('svc-1', elecciones);

    expect(guardarSpy).toHaveBeenCalled();
    const guardado = guardarSpy.mock.calls[0][0];
    // LOCAL: el campo queda sucio para reintentarlo en próxima sync
    expect(guardado.camposSucios).toContain('observacionTecnica');
    expect(guardado.conflictos).toHaveLength(0); // Conflicto resuelto
    expect(guardado.syncState).toBe('pending');
  });

  it('aplica REMOTO: limpia el campo (ES-006-11)', async () => {
    const servicio = servicioBuilder({
      id: 'svc-1',
      conflictos: [{ campo: 'diagnostico', local: 'Diagnóstico A', remoto: 'Diagnóstico B' }],
      syncState: 'conflict',
      base: { diagnostico: 'Anterior' },
    });

    vi.spyOn(mockServicios, 'obtener').mockResolvedValue(servicio);
    const guardarSpy = vi.spyOn(mockServicios, 'guardar');

    const resolver = crearResolverConflictos({
      servicios: mockServicios as ServicioRepository,
      reloj: mockClock as Clock,
    });

    const elecciones = [{ campo: 'diagnostico' as const, usar: 'REMOTO' as const }];

    await resolver('svc-1', elecciones);

    expect(guardarSpy).toHaveBeenCalled();
    const guardado = guardarSpy.mock.calls[0][0];
    // REMOTO: el campo se limpia (se toma del base que tiene el valor remoto)
    expect(guardado.camposSucios).not.toContain('diagnostico');
    expect(guardado.diagnostico).toBe('Diagnóstico B');
    expect(guardado.syncState).toBe('synced');
  });
});
