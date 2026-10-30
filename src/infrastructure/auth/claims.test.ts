import { describe, expect, it } from 'vitest';

import { extraerCuenta, filtrarRoles, validarTenantYRoles } from './claims';

const TENANT = '11111111-1111-1111-1111-111111111111';

const claimsBase = {
  tid: TENANT,
  oid: 'oid-1',
  name: 'Ana Tecnica',
  preferred_username: 'ana@empresa.com',
  roles: ['Tecnico'],
};

describe('validarTenantYRoles', () => {
  it('acepta una cuenta del tenant con rol', () => {
    const resultado = validarTenantYRoles(claimsBase, TENANT, { homeId: 'home-1' });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.cuenta).toMatchObject({
      id: 'oid-1',
      nombre: 'Ana Tecnica',
      correo: 'ana@empresa.com',
      homeId: 'home-1',
      roles: ['Tecnico'],
    });
  });

  it('rechaza una cuenta de otro tenant (ES-004-04)', () => {
    const resultado = validarTenantYRoles({ ...claimsBase, tid: 'otro' }, TENANT);
    expect(resultado).toEqual({ ok: false, codigo: 'AUTH_TENANT_INVALIDO' });
  });

  it('rechaza una cuenta sin rol (ES-004-03)', () => {
    const resultado = validarTenantYRoles({ ...claimsBase, roles: [] }, TENANT);
    expect(resultado).toEqual({ ok: false, codigo: 'AUTH_SIN_ROL' });
  });

  it('filtra roles desconocidos y conserva los validos', () => {
    expect(filtrarRoles(['Tecnico', 'Superusuario', 'Administrador'])).toEqual([
      'Tecnico',
      'Administrador',
    ]);
  });

  it('extrae la cuenta sin roles validos si se usa directamente', () => {
    const cuenta = extraerCuenta({ ...claimsBase, roles: ['Otro'] });
    expect(cuenta.roles).toEqual([]);
  });
});
