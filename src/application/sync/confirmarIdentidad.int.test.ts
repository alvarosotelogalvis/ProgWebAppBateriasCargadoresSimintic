import { afterEach, describe, expect, it } from 'vitest';

import type { IntencionSync, IntencionSyncPort } from '@/application/ports/IntencionSyncPort';
import { CLAVES_META } from '@/application/setup/claves';
import type { ConfigApp } from '@/domain/config';
import { CONFIG_DEFECTO } from '@/domain/config';
import type { CuentaUsuario } from '@/domain/servicio';
import { MetaRepositoryDexie } from '@/infrastructure/db/metaRepository';
import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { FakeAuth } from '../../../tests/fakes/FakeAuth';
import { FakeClock } from '../../../tests/fakes/FakeClock';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';

import { crearConfirmarIdentidad } from './confirmarIdentidad';
import { leerIntencionVigente, VIGENCIA_INTENCION_MS } from './intencionSync';

const TENANT = '22222222-2222-2222-2222-222222222222';

class IntencionFake implements IntencionSyncPort {
  public guardada: IntencionSync | null = null;
  public limpiezas = 0;

  guardar(intencion: IntencionSync): void {
    this.guardada = intencion;
  }

  leer(): IntencionSync | null {
    return this.guardada;
  }

  limpiar(): void {
    this.guardada = null;
    this.limpiezas += 1;
  }
}

const cuentaValida = (cambios: Partial<CuentaUsuario> = {}): CuentaUsuario => ({
  id: 'oid-1',
  nombre: 'Ana Pérez',
  correo: 'ana@empresa.com',
  roles: ['Tecnico'],
  tenantId: TENANT,
  ...cambios,
});

const cerrar: Array<() => Promise<void>> = [];
afterEach(async () => {
  const pendientes = cerrar.splice(0);
  await Promise.all(pendientes.map((fn) => fn()));
});

async function crearEntorno(opciones: {
  cuenta?: CuentaUsuario | null;
  config?: Partial<ConfigApp>;
  ultimoLogin?: string;
}) {
  const db = await crearDbPrueba();
  const meta = new MetaRepositoryDexie(db, new FakeIdGenerator());
  const auth = new FakeAuth(opciones.cuenta === undefined ? cuentaValida() : opciones.cuenta);
  const clock = new FakeClock(new Date('2026-10-21T12:00:00.000Z'));
  const intencion = new IntencionFake();
  const config = { ...CONFIG_DEFECTO, ...opciones.config } as ConfigApp;

  if (opciones.ultimoLogin !== undefined) {
    await meta.guardar(CLAVES_META.ultimoLoginInteractivoEn, opciones.ultimoLogin);
  }

  cerrar.push(async () => {
    await db.delete();
  });

  const confirmar = crearConfirmarIdentidad({
    auth,
    meta,
    clock,
    config: () => config,
    intencion,
    tenantId: TENANT,
  });

  return { auth, meta, clock, intencion, confirmar };
}

describe('confirmarIdentidad', () => {
  it('usa el token silencioso dentro de la ventana de reautenticación', async () => {
    const { auth, confirmar, intencion } = await crearEntorno({
      ultimoLogin: '2026-10-21T10:00:00.000Z',
    });

    const resultado = await confirmar({ correlationId: 'corr-1' });

    expect(resultado).toMatchObject({ ok: true, token: 'token-fake' });
    expect(auth.llamadas).toEqual(['asegurarToken']);
    expect(intencion.guardada).toBeNull();
  });

  it('pide login cuando la ventana de 12 h venció', async () => {
    const { auth, confirmar, intencion } = await crearEntorno({
      ultimoLogin: '2026-10-20T23:00:00.000Z',
    });

    const resultado = await confirmar({ correlationId: 'corr-2' });

    expect(resultado).toEqual({ ok: false, motivo: 'REDIRECT_EN_CURSO' });
    expect(auth.llamadas).toEqual(['iniciarSesion']);
    expect(auth.ultimaSesion).toEqual({ prompt: 'login' });
    expect(intencion.guardada).toMatchObject({
      timestamp: Date.parse('2026-10-21T12:00:00.000Z'),
      cuenta: { username: 'ana@empresa.com' },
    });
  });

  it('pide login siempre en modo reautenticar', async () => {
    const { auth, confirmar } = await crearEntorno({
      ultimoLogin: '2026-10-21T11:59:00.000Z',
      config: { syncModoAutenticacion: 'reautenticar' },
    });

    const resultado = await confirmar({ correlationId: 'corr-3' });

    expect(resultado).toEqual({ ok: false, motivo: 'REDIRECT_EN_CURSO' });
    expect(auth.llamadas).toEqual(['iniciarSesion']);
  });

  it('permite cambiar de cuenta y guarda la intención', async () => {
    const { auth, confirmar, intencion } = await crearEntorno({
      ultimoLogin: '2026-10-21T11:00:00.000Z',
    });

    const resultado = await confirmar({ otraCuenta: true, correlationId: 'corr-4' });

    expect(resultado).toEqual({ ok: false, motivo: 'REDIRECT_EN_CURSO' });
    expect(auth.llamadas).toEqual(['cambiarCuenta']);
    expect(intencion.guardada?.cuenta.username).toBe('ana@empresa.com');
  });

  it('rechaza una cuenta de otro tenant sin pedir token', async () => {
    const { auth, confirmar, intencion } = await crearEntorno({
      cuenta: cuentaValida({ tenantId: 'otro-tenant' }),
      ultimoLogin: '2026-10-21T11:00:00.000Z',
    });

    const resultado = await confirmar({ correlationId: 'corr-5' });

    expect(resultado).toEqual({ ok: false, motivo: 'TENANT_INVALIDO' });
    expect(auth.llamadas).toEqual([]);
    expect(intencion.guardada).toBeNull();
  });

  it('rechaza una cuenta sin rol de la app', async () => {
    const { auth, confirmar } = await crearEntorno({
      cuenta: cuentaValida({ roles: [] }),
      ultimoLogin: '2026-10-21T11:00:00.000Z',
    });

    const resultado = await confirmar({ correlationId: 'corr-6' });

    expect(resultado).toEqual({ ok: false, motivo: 'SIN_ROL' });
    expect(auth.llamadas).toEqual([]);
  });

  it('pide login cuando no hay cuenta activa', async () => {
    const { auth, confirmar, intencion } = await crearEntorno({ cuenta: null });

    const resultado = await confirmar({ correlationId: 'corr-7' });

    expect(resultado).toEqual({ ok: false, motivo: 'REDIRECT_EN_CURSO' });
    expect(auth.llamadas).toEqual(['iniciarSesion']);
    expect(intencion.guardada?.cuenta.username).toBe('');
  });
});

describe('leerIntencionVigente', () => {
  it('recupera una intención de menos de 10 minutos', () => {
    const intencion = new IntencionFake();
    const ahora = Date.parse('2026-10-21T12:00:00.000Z');
    intencion.guardar({
      cuenta: { username: 'ana@empresa.com' },
      timestamp: ahora - 60_000,
      returnUrl: '/sincronizacion?reanudar=1',
    });

    expect(leerIntencionVigente(intencion, ahora)).toMatchObject({
      returnUrl: '/sincronizacion?reanudar=1',
    });
    expect(intencion.limpiezas).toBe(0);
  });

  it('descarta y limpia una intención vencida', () => {
    const intencion = new IntencionFake();
    const ahora = Date.parse('2026-10-21T12:00:00.000Z');
    intencion.guardar({
      cuenta: { username: 'ana@empresa.com' },
      timestamp: ahora - VIGENCIA_INTENCION_MS - 1,
    });

    expect(leerIntencionVigente(intencion, ahora)).toBeNull();
    expect(intencion.limpiezas).toBe(1);
    expect(intencion.guardada).toBeNull();
  });
});
