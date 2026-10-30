import type { AuthPort, OpcionesIniciarSesion } from '@/application/ports/authPort';
import type { CuentaUsuario, Rol } from '@/domain/servicio';

export const CUENTA_MOCK: CuentaUsuario = {
  id: 'mock-local',
  nombre: 'Tecnico Demo',
  correo: 'tecnico.demo@empresa.com',
  roles: ['Tecnico', 'Comercial', 'Administrador'],
  tenantId: 'mock-tenant',
  homeId: 'mock-home',
};

const CLAVE_CUENTA_MOCK = 'auth_cuenta_mock';

function leerCuentaGuardada(): CuentaUsuario | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE_CUENTA_MOCK);
    return crudo ? (JSON.parse(crudo) as CuentaUsuario) : null;
  } catch {
    return null;
  }
}

/** Autenticacion simulada: solo para pruebas y desarrollo sin tenant (SDD §8.6). */
export class MockAuthAdapter implements AuthPort {
  private cuenta: CuentaUsuario | null = leerCuentaGuardada();

  async inicializar(): Promise<void> {
    return undefined;
  }

  cuentaActiva(): CuentaUsuario | null {
    return this.cuenta;
  }

  rolesCacheados(): readonly Rol[] {
    return this.cuenta?.roles ?? [];
  }

  sesionVigente(): boolean {
    return this.cuenta !== null;
  }

  async iniciarSesion(_opciones?: OpcionesIniciarSesion): Promise<void> {
    this.guardarCuenta(CUENTA_MOCK);
  }

  async asegurarToken(): Promise<string> {
    if (!this.cuenta) {
      throw new Error('AUTH_REQUERIDA');
    }
    return 'token-mock';
  }

  async cambiarCuenta(): Promise<void> {
    this.guardarCuenta(CUENTA_MOCK);
  }

  async cerrarSesion(): Promise<void> {
    this.guardarCuenta(null);
  }

  /**
   * Mantiene la sesion mock en `sessionStorage` para que sobreviva a recargas
   * (p. ej. `page.goto` en E2E), igual que haria MSAL con su cache.
   */
  private guardarCuenta(cuenta: CuentaUsuario | null): void {
    this.cuenta = cuenta;
    try {
      if (cuenta) {
        sessionStorage.setItem(CLAVE_CUENTA_MOCK, JSON.stringify(cuenta));
      } else {
        sessionStorage.removeItem(CLAVE_CUENTA_MOCK);
      }
    } catch {
      // Sin sessionStorage la sesion solo vive en memoria.
    }
  }
}
