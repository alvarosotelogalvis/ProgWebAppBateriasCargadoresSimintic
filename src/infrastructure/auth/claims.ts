import type { CuentaUsuario, Rol } from '@/domain/servicio';

export const ROLES_VALIDOS: readonly Rol[] = ['Tecnico', 'Comercial', 'Administrador'];

export interface ClaimsIdToken {
  readonly tid?: string;
  readonly oid?: string;
  readonly sub?: string;
  readonly name?: string;
  readonly preferred_username?: string;
  readonly email?: string;
  readonly upn?: string;
  readonly roles?: readonly string[];
}

export type ResultadoValidacion =
  | { readonly ok: true; readonly cuenta: CuentaUsuario }
  | { readonly ok: false; readonly codigo: 'AUTH_TENANT_INVALIDO' | 'AUTH_SIN_ROL' };

export function filtrarRoles(roles: readonly string[] | undefined): Rol[] {
  if (!roles) return [];
  return ROLES_VALIDOS.filter((rol) => roles.includes(rol));
}

export function extraerCuenta(
  claims: ClaimsIdToken,
  opciones: { readonly homeId?: string; readonly ultimoLoginInteractivoEn?: string } = {}
): CuentaUsuario {
  const correo = claims.preferred_username ?? claims.email ?? claims.upn ?? '';
  return {
    id: claims.oid ?? claims.sub ?? opciones.homeId ?? correo,
    nombre: claims.name ?? correo,
    correo,
    roles: filtrarRoles(claims.roles),
    ...(claims.tid ? { tenantId: claims.tid } : {}),
    ...(opciones.homeId ? { homeId: opciones.homeId } : {}),
    ...(opciones.ultimoLoginInteractivoEn
      ? { ultimoLoginInteractivoEn: opciones.ultimoLoginInteractivoEn }
      : {}),
  };
}

export function validarTenantYRoles(
  claims: ClaimsIdToken,
  tenantEsperado: string,
  opciones: { readonly homeId?: string; readonly ultimoLoginInteractivoEn?: string } = {}
): ResultadoValidacion {
  if (!claims.tid || claims.tid.toLowerCase() !== tenantEsperado.toLowerCase()) {
    return { ok: false, codigo: 'AUTH_TENANT_INVALIDO' };
  }

  const cuenta = extraerCuenta(claims, opciones);
  if (cuenta.roles.length === 0) {
    return { ok: false, codigo: 'AUTH_SIN_ROL' };
  }

  return { ok: true, cuenta };
}
