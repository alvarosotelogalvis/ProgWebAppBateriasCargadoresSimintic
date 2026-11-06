import { describe, expect, it } from 'vitest';

import type { AuthPort } from '@/application/ports/authPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import { CONFIG_DEFECTO, type ConfigApp } from '@/domain/config';
import type { CuentaUsuario } from '@/domain/servicio';

import {
  antiguedadHoras,
  debeMostrarAvisoConexion,
  debeRecordarPendientes,
  INTERVALO_AVISO_CONEXION_MS,
  sesionSyncVigente,
} from './avisosSync';

const AHORA = Date.parse('2026-11-06T12:00:00.000Z');
const HORA = 60 * 60 * 1000;

describe('debeMostrarAvisoConexion (ES-005-21)', () => {
  const base = { pendientes: 2, sesionVigente: true, ultimoAvisoMs: null, ahoraMs: AHORA };

  it('avisa con pendientes y sesión vigente', () => {
    expect(debeMostrarAvisoConexion(base)).toBe(true);
  });

  it('no avisa sin pendientes ni sin sesión vigente', () => {
    expect(debeMostrarAvisoConexion({ ...base, pendientes: 0 })).toBe(false);
    expect(debeMostrarAvisoConexion({ ...base, sesionVigente: false })).toBe(false);
  });

  it('avisa como máximo una vez cada 30 minutos', () => {
    expect(
      debeMostrarAvisoConexion({ ...base, ultimoAvisoMs: AHORA - INTERVALO_AVISO_CONEXION_MS + 1 })
    ).toBe(false);
    expect(
      debeMostrarAvisoConexion({ ...base, ultimoAvisoMs: AHORA - INTERVALO_AVISO_CONEXION_MS })
    ).toBe(true);
  });
});

describe('recordatorio de pendientes (ES-005-22)', () => {
  it('calcula la antigüedad en horas del pendiente más antiguo', () => {
    expect(antiguedadHoras(undefined, AHORA)).toBeNull();
    expect(antiguedadHoras('no es fecha', AHORA)).toBeNull();
    expect(antiguedadHoras(new Date(AHORA - 30 * HORA).toISOString(), AHORA)).toBe(30);
  });

  it('recuerda solo cuando se supera el umbral configurado', () => {
    const hace = (horas: number) => new Date(AHORA - horas * HORA).toISOString();
    expect(debeRecordarPendientes(hace(23), AHORA, 24)).toBe(false);
    expect(debeRecordarPendientes(hace(24), AHORA, 24)).toBe(true);
    expect(debeRecordarPendientes(undefined, AHORA, 24)).toBe(false);
  });
});

describe('sesionSyncVigente', () => {
  const CUENTA: CuentaUsuario = {
    id: 'u1',
    nombre: 'Ana',
    correo: 'ana@empresa.com',
    roles: ['Tecnico'],
    tenantId: 't',
  };

  function deps(
    opciones: {
      cuenta?: CuentaUsuario | null;
      vigente?: boolean;
      ultimoLogin?: string;
      config?: Partial<ConfigApp>;
    } = {}
  ) {
    const auth = {
      cuentaActiva: () => (opciones.cuenta === undefined ? CUENTA : opciones.cuenta),
      sesionVigente: () => opciones.vigente ?? true,
    } as unknown as AuthPort;
    const meta = {
      obtener: async () => opciones.ultimoLogin,
    } as unknown as MetaRepository;
    return {
      auth,
      meta,
      clock: { ahoraMs: () => AHORA },
      config: () => ({ ...CONFIG_DEFECTO, ...opciones.config }),
    };
  }

  it('es vigente dentro de la ventana de reautenticación', async () => {
    const ultimoLogin = new Date(AHORA - 2 * HORA).toISOString();
    await expect(sesionSyncVigente(deps({ ultimoLogin }))).resolves.toBe(true);
  });

  it('no es vigente sin cuenta, sin sesión, fuera de la ventana o en modo reautenticar', async () => {
    const reciente = new Date(AHORA - 2 * HORA).toISOString();
    await expect(sesionSyncVigente(deps({ cuenta: null }))).resolves.toBe(false);
    await expect(sesionSyncVigente(deps({ vigente: false, ultimoLogin: reciente }))).resolves.toBe(
      false
    );
    await expect(
      sesionSyncVigente(deps({ ultimoLogin: new Date(AHORA - 13 * HORA).toISOString() }))
    ).resolves.toBe(false);
    await expect(
      sesionSyncVigente(
        deps({ ultimoLogin: reciente, config: { syncModoAutenticacion: 'reautenticar' } })
      )
    ).resolves.toBe(false);
  });
});
