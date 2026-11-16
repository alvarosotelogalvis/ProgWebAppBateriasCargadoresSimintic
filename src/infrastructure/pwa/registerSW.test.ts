import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { aplicarNuevaVersion } from './registerSW';

const recargar = vi.fn();
const locationOriginal = window.location;

const instalarServiceWorker = (registro: unknown): { escuchas: Map<string, () => void> } => {
  const escuchas = new Map<string, () => void>();
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registro),
      addEventListener: (tipo: string, fn: () => void) => escuchas.set(tipo, fn),
    },
  });
  return { escuchas };
};

beforeEach(() => {
  recargar.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...locationOriginal, reload: recargar },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: locationOriginal });
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('aplicarNuevaVersion (ES-001-20)', () => {
  it('con un service worker en espera le pide tomar el control y recarga cuando lo hace', async () => {
    const postMessage = vi.fn();
    const update = vi.fn().mockResolvedValue(undefined);
    const { escuchas } = instalarServiceWorker({ update, waiting: { postMessage } });

    await aplicarNuevaVersion();

    expect(update).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(recargar).not.toHaveBeenCalled(); // aún no: espera a que tome el control

    escuchas.get('controllerchange')?.();

    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('sin service worker en espera solo recarga', async () => {
    instalarServiceWorker({ update: vi.fn().mockResolvedValue(undefined), waiting: null });

    await aplicarNuevaVersion();

    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('sin soporte de service worker solo recarga', async () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');

    await aplicarNuevaVersion();

    expect(recargar).toHaveBeenCalledTimes(1);
  });
});
