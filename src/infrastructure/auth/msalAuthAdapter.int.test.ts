import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';

import { MsalAuthAdapter, type ClienteMsal } from './msalAuthAdapter';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('MsalAuthAdapter', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('usa meta.ultimaCuenta con caché vacío', async () => {
    const cuenta = { id: 'u1', nombre: 'Ana', correo: 'ana@empresa.com', roles: ['Tecnico'] };
    localStorageMock.setItem('ultimaCuenta', JSON.stringify(cuenta));
    const meta = {
      obtener: vi.fn(async (k: string) => (k === 'ultimaCuenta' ? cuenta : undefined)),
      guardar: vi.fn(async () => undefined),
      dispositivoId: vi.fn(async () => 'disp'),
    } as unknown as MetaRepository;
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    const cliente = {
      getAllAccounts: vi.fn(() => []),
      getActiveAccount: vi.fn(() => null),
      setActiveAccount: vi.fn(),
      loginRedirect: vi.fn(async () => undefined),
      acquireTokenSilent: vi.fn(async () => ({ accessToken: 't' })),
      acquireTokenRedirect: vi.fn(async () => undefined),
      logoutRedirect: vi.fn(async () => undefined),
    } as unknown as ClienteMsal;
    const adapter = new MsalAuthAdapter({ cliente, meta, logger });
    await adapter.inicializar();
    const activa = adapter.cuentaActiva();
    expect(activa?.correo).toBe('ana@empresa.com');
  });
});
