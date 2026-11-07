import { describe, expect, it, vi } from 'vitest';

import { EventBusSync, type EventoSync } from './eventosSync';

const OCUPADO: EventoSync = { tipo: 'ocupado' };

describe('EventBusSync', () => {
  it('una escucha que falla no interrumpe a las demás ni la sincronización', () => {
    const bus = new EventBusSync();
    const segunda = vi.fn();
    bus.on(() => {
      throw new Error('escucha defectuosa');
    });
    bus.suscribir(segunda);

    expect(() => bus.emitir(OCUPADO)).not.toThrow();
    expect(segunda).toHaveBeenCalledWith(OCUPADO);
  });

  it('deja de notificar a una escucha desuscrita', () => {
    const bus = new EventBusSync();
    const escucha = vi.fn();
    const desuscribir = bus.on(escucha);

    desuscribir();
    bus.emitir(OCUPADO);

    expect(escucha).not.toHaveBeenCalled();
  });
});
