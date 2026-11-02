import type {
  AuthPort,
  OpcionesAsegurarToken,
  OpcionesIniciarSesion,
} from '@/application/ports/authPort';
import type { CuentaUsuario, Rol } from '@/domain/servicio';

export const CUENTA_ADMIN: CuentaUsuario = {
  id: 'mock-local',
  nombre: 'Tecnico Demo',
  correo: 'tecnico.demo@empresa.com',
  roles: ['Tecnico', 'Comercial', 'Administrador'],
};

export class FakeAuth implements AuthPort {
  private cuenta: CuentaUsuario | null;
  readonly llamadas: string[] = [];
  ultimaSesion: OpcionesIniciarSesion | undefined;
  errorAsegurarToken: unknown;

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

  async iniciarSesion(opciones: OpcionesIniciarSesion = {}): Promise<void> {
    this.llamadas.push('iniciarSesion');
    this.ultimaSesion = opciones;
    this.cuenta = CUENTA_ADMIN;
  }

  async asegurarToken(_opciones: OpcionesAsegurarToken): Promise<string> {
    this.llamadas.push('asegurarToken');
    if (this.errorAsegurarToken) throw this.errorAsegurarToken;
    return 'token-fake';
  }

  async cambiarCuenta(): Promise<void> {
    this.llamadas.push('cambiarCuenta');
    this.cuenta = CUENTA_ADMIN;
  }

  async cerrarSesion(): Promise<void> {
    this.llamadas.push('cerrarSesion');
    this.cuenta = null;
  }

  simularLogin(cuenta: CuentaUsuario = CUENTA_ADMIN): void {
    this.cuenta = cuenta;
  }
}
