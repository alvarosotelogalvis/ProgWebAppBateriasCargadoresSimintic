import type { AuthPort } from '@/application/ports/authPort';
import type { Clock } from '@/application/ports/clock';
import type { IntencionSyncPort } from '@/application/ports/IntencionSyncPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import { CLAVES_META } from '@/application/setup/claves';
import type { ConfigApp, ModoAutenticacionSync } from '@/domain/config';
import type { CuentaUsuario } from '@/domain/servicio';
import { aAppError } from '@/shared/errors';

export interface DepsConfirmarIdentidad {
  readonly auth: AuthPort;
  readonly meta: MetaRepository;
  readonly clock: Clock;
  readonly config: () => ConfigApp;
  readonly intencion: IntencionSyncPort;
  /** Tenant de Entra ID esperado (VITE_ENTRA_TENANT_ID). Si falta, no se valida. */
  readonly tenantId?: string;
}

export type MotivoSinIdentidad = 'REDIRECT_EN_CURSO' | 'TENANT_INVALIDO' | 'SIN_ROL' | 'CANCELADO';

export type ResultadoIdentidad =
  | { readonly ok: true; readonly token: string; readonly cuenta: CuentaUsuario }
  | { readonly ok: false; readonly motivo: MotivoSinIdentidad };

export interface OpcionesConfirmarIdentidad {
  /** Fuerza el selector de cuentas de Microsoft. */
  readonly otraCuenta?: boolean;
  readonly correlationId?: string;
  readonly returnUrl?: string;
}

export type ConfirmarIdentidad = (
  opciones?: OpcionesConfirmarIdentidad
) => Promise<ResultadoIdentidad>;

const REDIRECT = { ok: false, motivo: 'REDIRECT_EN_CURSO' } as const;

const HORA_MS = 60 * 60 * 1000;

/** Ventana de reautenticación: sin login interactivo reciente se pide de nuevo. */
export function requiereReautenticacion(
  modo: ModoAutenticacionSync,
  ultimoLoginIso: string | undefined,
  horasVentana: number,
  ahoraMs: number
): boolean {
  if (modo === 'reautenticar') return true;
  if (!ultimoLoginIso) return true;

  const ultimo = Date.parse(ultimoLoginIso);
  if (!Number.isFinite(ultimo)) return true;

  const ventana = Math.max(0, horasVentana) * HORA_MS;
  return ahoraMs - ultimo >= ventana;
}

/**
 * Decide si la sincronización puede empezar con un token silencioso o si debe
 * pasar por el login interactivo (SDD §8.4). Cuando hace falta un redirect guarda
 * la intención para reanudar el sync al volver (ES-005-03).
 */
export function crearConfirmarIdentidad(deps: DepsConfirmarIdentidad): ConfirmarIdentidad {
  return async (opciones = {}) => {
    const cuenta = deps.auth.cuentaActiva();

    if (opciones.otraCuenta === true) {
      guardarIntencion(deps, cuenta, opciones);
      await deps.auth.cambiarCuenta();
      return REDIRECT;
    }

    if (!cuenta) {
      guardarIntencion(deps, null, opciones);
      await deps.auth.iniciarSesion({ prompt: 'login' });
      return REDIRECT;
    }

    if (
      deps.tenantId &&
      cuenta.tenantId &&
      cuenta.tenantId.toLowerCase() !== deps.tenantId.toLowerCase()
    ) {
      return { ok: false, motivo: 'TENANT_INVALIDO' };
    }

    if (cuenta.roles.length === 0) {
      return { ok: false, motivo: 'SIN_ROL' };
    }

    const config = deps.config();
    const ultimoLogin =
      (await deps.meta.obtener<string>(CLAVES_META.ultimoLoginInteractivoEn)) ??
      cuenta.ultimoLoginInteractivoEn;

    if (
      requiereReautenticacion(
        config.syncModoAutenticacion,
        ultimoLogin,
        config.syncReautenticacionHoras,
        deps.clock.ahoraMs()
      )
    ) {
      guardarIntencion(deps, cuenta, opciones);
      await deps.auth.iniciarSesion({ prompt: 'login' });
      return REDIRECT;
    }

    try {
      const token = await deps.auth.asegurarToken({ interactivoSiEsNecesario: true });
      return { ok: true, token, cuenta };
    } catch (causa) {
      const error = aAppError(causa);
      if (error.codigo === 'AUTH_REQUERIDA' || error.codigo === 'AUTH_SIN_ROL') {
        // `asegurarToken` ya pidió el redirect interactivo; la intención permite
        // reanudar al volver. Si el redirect no llegó a iniciarse, el usuario
        // vuelve a pulsar "Confirmar" sin efectos dañinos.
        guardarIntencion(deps, cuenta, opciones);
        return REDIRECT;
      }
      throw error;
    }
  };
}

function guardarIntencion(
  deps: DepsConfirmarIdentidad,
  cuenta: CuentaUsuario | null,
  opciones: OpcionesConfirmarIdentidad
): void {
  deps.intencion.guardar({
    cuenta: cuenta
      ? {
          username: cuenta.correo,
          nombre: cuenta.nombre,
          ...(cuenta.homeId ? { homeAccountId: cuenta.homeId } : {}),
        }
      : { username: '' },
    timestamp: deps.clock.ahoraMs(),
    returnUrl: opciones.returnUrl ?? '/sincronizacion?reanudar=1',
  });
}
