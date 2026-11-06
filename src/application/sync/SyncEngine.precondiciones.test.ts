import { describe, expect, it, vi } from 'vitest';

import { CLAVES_META } from '@/application/setup/claves';
import { CONFIG_DEFECTO, type ConfigApp } from '@/domain/config';
import { AppError } from '@/shared/errors';

import { MotorSync, type DepsSyncEngine } from './SyncEngine';

function crearMotor(opciones: {
  config: ConfigApp;
  refrescarConfig?: () => Promise<void>;
  appVersion?: string;
}) {
  let config = opciones.config;
  const lock = vi.fn(async () => ({ adquirido: false as const }));
  const deps = {
    meta: {
      obtener: async (clave: string) =>
        clave === CLAVES_META.configuracionInicialCompleta ? true : undefined,
    },
    config: () => config,
    appVersion: opciones.appVersion ?? '0.1.0',
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    lock,
    ...(opciones.refrescarConfig ? { refrescarConfig: opciones.refrescarConfig } : {}),
  } as unknown as DepsSyncEngine;
  return {
    motor: new MotorSync(deps),
    lock,
    cambiarConfig: (nueva: ConfigApp) => {
      config = nueva;
    },
  };
}

const sincronizar = (motor: MotorSync) =>
  motor.sincronizar({ correlationId: 'c', signal: new AbortController().signal });

describe('MotorSync · precondiciones (ES-005-24)', () => {
  it('refresca la configuración remota antes de comprobar la versión mínima', async () => {
    const entorno = crearMotor({
      config: { ...CONFIG_DEFECTO, versionMinimaApp: '0.1.0' },
      refrescarConfig: async () => {
        entorno.cambiarConfig({ ...CONFIG_DEFECTO, versionMinimaApp: '0.2.0' });
      },
    });

    const error = await sincronizar(entorno.motor).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).codigo).toBe('VERSION_OBSOLETA');
    expect(entorno.lock).not.toHaveBeenCalled();
  });

  it('si el refresco falla, sigue con la configuración en caché', async () => {
    const { motor, lock } = crearMotor({
      config: { ...CONFIG_DEFECTO, versionMinimaApp: '0.1.0' },
      refrescarConfig: async () => {
        throw new Error('sin red');
      },
    });

    await expect(sincronizar(motor)).resolves.toMatchObject({ ocupado: true });
    expect(lock).toHaveBeenCalled();
  });
});
