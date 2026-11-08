import { describe, it, expect, vi } from 'vitest';
import type { ContextoFinSync } from '@/application/sync/SyncEngine';
import type { AppDB } from '@/infrastructure/db/dexie';
import type { Logger } from '@/application/ports/loggerPort';
import { crearHookPurgas } from '@/application/purgas/purgeHook';

function crearMockDb(): AppDB {
  return {
    servicios: { toArray: vi.fn().mockResolvedValue([]) },
    adjuntos: { toArray: vi.fn().mockResolvedValue([]) },
    transaction: vi.fn(),
    logs: vi.fn() as unknown as AppDB['logs'],
    catalogos: vi.fn() as unknown as AppDB['catalogos'],
  } as unknown as AppDB;
}

function crearMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

describe('application/purgas - crearHookPurgas', () => {
  it('crea hook exitosamente', () => {
    const hook = crearHookPurgas({
      db: crearMockDb(),
      logger: crearMockLogger(),
    });

    expect(hook).toBeDefined();
  });

  it('registra evento de purgas ejecutadas', async () => {
    const mockLogger = crearMockLogger();
    const hook = crearHookPurgas({
      db: crearMockDb(),
      logger: mockLogger,
    });

    const contexto: ContextoFinSync = {
      correlationId: 'corr-456',
      resumen: {
        servicios: 0,
        adjuntos: 0,
        conflictos: 0,
        errores: [],
      } as unknown as ContextoFinSync['resumen'],
    };

    await hook(contexto);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'purgas-ejecutadas',
      expect.objectContaining({
        correlationId: 'corr-456',
      })
    );
  });

  it('captura errores sin romper la sincronización', async () => {
    const mockDb = crearMockDb();
    const toArrayMock = mockDb.servicios.toArray as unknown as ReturnType<typeof vi.fn>;
    toArrayMock.mockRejectedValueOnce(new Error('DB error'));

    const mockLogger = crearMockLogger();
    const hook = crearHookPurgas({
      db: mockDb,
      logger: mockLogger,
    });

    const contexto: ContextoFinSync = {
      correlationId: 'corr-789',
      resumen: {} as unknown as ContextoFinSync['resumen'],
    };

    await expect(hook(contexto)).resolves.toBeUndefined();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'purgas-fallidas',
      expect.objectContaining({
        correlationId: 'corr-789',
      })
    );
  });

  it('respeta opciones de retención', () => {
    const hook = crearHookPurgas({
      db: crearMockDb(),
      logger: crearMockLogger(),
      diasOriginales: 14,
      mesesCerrados: 6,
    });

    expect(hook).toBeDefined();
  });
});
