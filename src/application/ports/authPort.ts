import type { CuentaUsuario, Rol } from '@/domain/servicio';

export interface OpcionesAsegurarToken {
  interactivoSiEsNecesario: boolean;
  forzarLogin?: boolean;
}

export interface OpcionesIniciarSesion {
  prompt?: 'select_account' | 'login';
}

export interface AuthPort {
  inicializar(): Promise<void>;
  cuentaActiva(): CuentaUsuario | null;
  rolesCacheados(): readonly Rol[];
  sesionVigente(): boolean;
  iniciarSesion(opciones?: OpcionesIniciarSesion): Promise<void>;
  asegurarToken(opciones: OpcionesAsegurarToken): Promise<string>;
  cambiarCuenta(): Promise<void>;
  cerrarSesion(): Promise<void>;
}
