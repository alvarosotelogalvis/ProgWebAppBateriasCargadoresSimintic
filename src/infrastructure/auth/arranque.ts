import type { AccountInfo, AuthenticationResult } from '@azure/msal-browser';

import type { CuentaUsuario } from '@/domain/servicio';
import { obtenerEnv } from '@/shared/env';

import { validarTenantYRoles, type ClaimsIdToken } from './claims';
import { SCOPES_LOGIN } from './msalConfig';
import { obtenerMsalInstance } from './msalInstance';

export const CLAVE_RECHAZO_AUTH = 'auth_rechazo';
const CLAVE_CUENTA_VALIDADA = 'auth_cuenta_validada';

export type CodigoRechazoAuth = 'AUTH_TENANT_INVALIDO' | 'AUTH_SIN_ROL';

interface CuentaValidada {
  readonly cuenta: CuentaUsuario;
  readonly homeId?: string;
  readonly en: string;
}

let cuentaValidadaEnMemoria: CuentaValidada | undefined;

export function consumirCuentaValidada(): CuentaValidada | undefined {
  const cuenta =
    cuentaValidadaEnMemoria ??
    (leerSesion<CuentaValidada>(CLAVE_CUENTA_VALIDADA) as CuentaValidada | undefined);
  cuentaValidadaEnMemoria = undefined;
  borrarSesion(CLAVE_CUENTA_VALIDADA);
  return cuenta;
}

export function leerRechazoAuth(): CodigoRechazoAuth | undefined {
  return leerSesion<CodigoRechazoAuth>(CLAVE_RECHAZO_AUTH);
}

/**
 * Inicializa MSAL y completa un redirect pendiente antes de renderizar (FR-004-03).
 * Devuelve el codigo de rechazo cuando la cuenta no es valida.
 */
export function prepararAutenticacion(): Promise<CodigoRechazoAuth | undefined> {
  preparacion ??= procesarRedirect();
  return preparacion;
}

let preparacion: Promise<CodigoRechazoAuth | undefined> | undefined;

/**
 * ¿La URL trae la respuesta de un inicio de sesión (redirect de Entra ID)? Solo entonces hay que
 * resolverla antes de pintar la app; en un arranque normal MSAL puede cargarse sin bloquear.
 */
export function urlTraeRespuestaDeLogin(ubicacion: Pick<Location, 'hash' | 'search'>): boolean {
  return /[#?&](code|error|id_token|state)=/.test(`${ubicacion.hash}${ubicacion.search}`);
}

async function procesarRedirect(): Promise<CodigoRechazoAuth | undefined> {
  const env = obtenerEnv();
  if (!env.ok || env.env.VITE_AUTH_MODE === 'mock') return undefined;

  const msal = await obtenerMsalInstance();
  const resultado = await msal.handleRedirectPromise();
  if (!resultado?.account) return undefined;

  const validacion = validarResultado(resultado, env.env.VITE_ENTRA_TENANT_ID);
  if (!validacion.ok) {
    guardarSesion(CLAVE_RECHAZO_AUTH, validacion.codigo);
    try {
      await msal.logoutRedirect({
        account: resultado.account,
        onRedirectNavigate: () => false,
      });
    } catch {
      // El cache de MSAL ya se limpio; no se navega.
    }
    return validacion.codigo;
  }

  msal.setActiveAccount(resultado.account);
  const validada: CuentaValidada = {
    cuenta: validacion.cuenta,
    homeId: resultado.account.homeAccountId,
    en: new Date().toISOString(),
  };
  cuentaValidadaEnMemoria = validada;
  guardarSesion(CLAVE_CUENTA_VALIDADA, validada);
  return undefined;
}

/** Tras un rechazo, permite elegir otra cuenta sin cerrar la sesion de Microsoft. */
export async function reintentarAcceso(): Promise<void> {
  borrarSesion(CLAVE_RECHAZO_AUTH);
  const msal = await obtenerMsalInstance();
  await msal.loginRedirect({ scopes: SCOPES_LOGIN, prompt: 'select_account' });
}

function validarResultado(resultado: AuthenticationResult, tenantEsperado: string) {
  const claims = (resultado.idTokenClaims ?? {}) as ClaimsIdToken;
  return validarTenantYRoles(claims, tenantEsperado, {
    homeId: resultado.account?.homeAccountId,
    ultimoLoginInteractivoEn: new Date().toISOString(),
  });
}

export function cuentaDesdeMsal(account: AccountInfo, tenantEsperado: string) {
  const claims = (account.idTokenClaims ?? {}) as ClaimsIdToken;
  return validarTenantYRoles(claims, tenantEsperado, {
    homeId: account.homeAccountId,
    ultimoLoginInteractivoEn: new Date().toISOString(),
  });
}

function guardarSesion(clave: string, valor: unknown): void {
  try {
    sessionStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sessionStorage puede no estar disponible; se mantiene la copia en memoria.
  }
}

function leerSesion<T>(clave: string): T | undefined {
  try {
    const crudo = sessionStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : undefined;
  } catch {
    return undefined;
  }
}

function borrarSesion(clave: string): void {
  try {
    sessionStorage.removeItem(clave);
  } catch {
    // Sin sessionStorage no hay nada que borrar.
  }
}
