import type { AuthPort } from '@/application/ports/authPort';
import type { CuentaUsuario, Rol } from '@/domain/servicio';

export const CUENTA_ADMIN: CuentaUsuario = {
  id: 'mock-local',
  nombre: 'Tecnico Demo',
  correo: 'tecnico.demo@empresa.com',
  roles: ['Tecnico', 'Comercial', 'Administrador'],
};

export class FakeAuth implements AuthPort {
  private cuenta: CuentaUsuario | null;

  constructor(cuenta: CuentaUsuario | null = CUENTA_ADMIN) {
    this.cuenta = cuenta;
  }

  cuentaActiva(): CuentaUsuario | null {
    return this.cuenta;
  }

  rolesCacheados(): readonly Rol[] {
    return this.cuenta?.roles ?? [];
  }

  async inicializar(): Promise<void> {
    return undefined;
  }

  sesionVigente(): boolean {
    return this.cuenta !== null;
  }

  async iniciarSesion(): Promise<void> {
    this.cuenta = CUENTA_ADMIN;
  }

  async asegurarToken(): Promise<string> {
    return 'token-fake';
  }

  async cambiarCuenta(): Promise<void> {
    this.cuenta = CUENTA_ADMIN;
  }

  async cerrarSesion(): Promise<void> {
    this.cuenta = null;
  }

  simularLogin(cuenta: CuentaUsuario = CUENTA_ADMIN): void {
    this.cuenta = cuenta;
  }
}
