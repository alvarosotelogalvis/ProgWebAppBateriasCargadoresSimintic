import type {
  AccountInfo,
  AuthenticationResult,
  PopupRequest,
  RedirectRequest,
  SilentRequest,
} from '@azure/msal-browser';

import type { AuthPort, OpcionesIniciarSesion } from '@/application/ports/authPort';
import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import { CLAVES_META } from '@/application/setup/claves';
import type { CuentaUsuario, Rol } from '@/domain/servicio';
import { obtenerEnv } from '@/shared/env';
import { AppError } from '@/shared/errors';

import { consumirCuentaValidada, cuentaDesdeMsal } from './arranque';
import { SCOPES_GRAPH, SCOPES_LOGIN } from './msalConfig';

export interface ClienteMsal {
  getActiveAccount(): AccountInfo | null;
  getAllAccounts(): AccountInfo[];
  setActiveAccount(account: AccountInfo | null): void;
  loginRedirect(request: RedirectRequest | PopupRequest): Promise<void>;
  acquireTokenSilent(request: SilentRequest): Promise<AuthenticationResult>;
  acquireTokenRedirect(request: RedirectRequest): Promise<void>;
  logoutRedirect(request?: {
    account?: AccountInfo | null;
    onRedirectNavigate?: () => boolean;
  }): Promise<void>;
}

export interface DepsMsalAdapter {
  readonly cliente: ClienteMsal;
  readonly meta: MetaRepository;
  readonly logger: Logger;
}

export class MsalAuthAdapter implements AuthPort {
  private cuenta: CuentaUsuario | null = null;
  private sesionMsal = false;

  constructor(private readonly deps: DepsMsalAdapter) {}

  async inicializar(): Promise<void> {
    const validada = consumirCuentaValidada();
    if (validada) {
      this.cuenta = validada.cuenta;
      this.sesionMsal = true;
      await this.guardarCuenta(validada.cuenta, validada.homeId, validada.en);
      return;
    }

    const ultima = await this.deps.meta.obtener<CuentaUsuario>(CLAVES_META.ultimaCuenta);
    const cuentaMsal = this.obtenerCuentaMsal();
    if (cuentaMsal) {
      this.cuenta = cuentaMsal;
      this.sesionMsal = true;
      return;
    }

    this.cuenta = ultima ?? null;
    this.sesionMsal = false;
  }

  cuentaActiva(): CuentaUsuario | null {
    return this.cuenta;
  }

  rolesCacheados(): readonly Rol[] {
    return this.cuenta?.roles ?? [];
  }

  sesionVigente(): boolean {
    return this.sesionMsal && this.cuenta !== null;
  }

  async iniciarSesion(opciones: OpcionesIniciarSesion = {}): Promise<void> {
    await this.deps.cliente.loginRedirect({
      scopes: SCOPES_LOGIN,
      prompt: opciones.prompt ?? 'select_account',
    });
  }

  async asegurarToken(opciones: {
    interactivoSiEsNecesario: boolean;
    forzarLogin?: boolean;
  }): Promise<string> {
    const account = this.deps.cliente.getActiveAccount() ?? this.deps.cliente.getAllAccounts()[0];
    if (!account) {
      throw this.errorAuth();
    }

    try {
      const resultado = await this.deps.cliente.acquireTokenSilent({
        scopes: SCOPES_GRAPH,
        account,
        forceRefresh: opciones.forzarLogin ?? false,
      });
      return resultado.accessToken;
    } catch (causa) {
      if (this.requiereInteraccion(causa)) {
        if (opciones.interactivoSiEsNecesario) {
          await this.deps.cliente.acquireTokenRedirect({ scopes: SCOPES_LOGIN, account });
        }
        throw this.errorAuth(causa);
      }
      throw this.errorAuth(causa);
    }
  }

  async cambiarCuenta(): Promise<void> {
    await this.iniciarSesion({ prompt: 'select_account' });
  }

  async cerrarSesion(): Promise<void> {
    const account = this.deps.cliente.getActiveAccount() ?? this.deps.cliente.getAllAccounts()[0];
    this.deps.logger.info('auth.logout', {});
    try {
      await this.deps.cliente.logoutRedirect(account ? { account } : {});
    } finally {
      this.deps.cliente.setActiveAccount(null);
      this.sesionMsal = false;
      this.cuenta = null;
    }
  }

  private obtenerCuentaMsal(): CuentaUsuario | null {
    const env = obtenerEnv();
    if (!env.ok) return null;

    const account =
      this.deps.cliente.getActiveAccount() ?? this.deps.cliente.getAllAccounts()[0] ?? null;
    if (!account) return null;

    const resultado = cuentaDesdeMsal(account, env.env.VITE_ENTRA_TENANT_ID);
    return resultado.ok ? resultado.cuenta : null;
  }

  private async guardarCuenta(
    cuenta: CuentaUsuario,
    homeId: string | undefined,
    ultimoLogin: string
  ): Promise<void> {
    await this.deps.meta.guardar(CLAVES_META.ultimaCuenta, cuenta);
    await this.deps.meta.guardar(CLAVES_META.ultimoLoginInteractivoEn, ultimoLogin);
    if (homeId) await this.deps.meta.guardar(CLAVES_META.cuentaHomeId, homeId);
  }

  private requiereInteraccion(causa: unknown): boolean {
    const nombre =
      typeof causa === 'object' && causa !== null && 'name' in causa
        ? String((causa as { name?: unknown }).name ?? '')
        : '';
    const mensaje = causa instanceof Error ? causa.message : '';
    return (
      nombre === 'InteractionRequiredAuthError' ||
      mensaje.includes('interaction_required') ||
      mensaje.includes('login_required') ||
      mensaje.includes('consent_required')
    );
  }

  private errorAuth(causa?: unknown): AppError {
    return new AppError({
      codigo: 'AUTH_REQUERIDA',
      mensaje: 'Debes iniciar sesion para continuar.',
      claveI18n: 'errores.codigo.AUTH_REQUERIDA',
      causa,
    });
  }
}
