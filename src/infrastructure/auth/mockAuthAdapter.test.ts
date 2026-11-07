import { beforeEach, describe, expect, it } from 'vitest';

import type { IntencionSyncPort } from '@/application/ports/IntencionSyncPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import { crearConfirmarIdentidad } from '@/application/sync/confirmarIdentidad';
import { CONFIG_DEFECTO } from '@/domain/config';

import { MockAuthAdapter } from './mockAuthAdapter';

const metaVacia: MetaRepository = {
  obtener: async () => undefined,
  guardar: async () => undefined,
  dispositivoId: async () => 'dispositivo',
};

const intencion: IntencionSyncPort = {
  guardar: () => undefined,
  leer: () => null,
  limpiar: () => undefined,
} as unknown as IntencionSyncPort;

beforeEach(() => {
  sessionStorage.clear();
});

describe('MockAuthAdapter', () => {
  it('simula un login interactivo reciente para que el modo demo pueda sincronizar', async () => {
    const auth = new MockAuthAdapter();
    await auth.iniciarSesion();

    expect(auth.cuentaActiva()?.ultimoLoginInteractivoEn).toEqual(expect.any(String));

    const confirmar = crearConfirmarIdentidad({
      auth,
      meta: metaVacia,
      clock: {
        ahoraMs: () => Date.now(),
        ahoraIso: () => new Date().toISOString(),
        fechaHoyIso: () => new Date().toISOString().slice(0, 10),
      },
      config: () => CONFIG_DEFECTO,
      intencion,
    });

    await expect(confirmar()).resolves.toMatchObject({ ok: true });
  });

  it('conserva la fecha del login al recargar', async () => {
    await new MockAuthAdapter().iniciarSesion();
    const recargado = new MockAuthAdapter();
    expect(recargado.cuentaActiva()?.ultimoLoginInteractivoEn).toEqual(expect.any(String));
  });
});
