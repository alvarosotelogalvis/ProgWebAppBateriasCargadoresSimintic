import type { CuentaUsuario, Rol } from '@/domain/servicio';

export interface OpcionesAsegurarToken {
  interactivoSiEsNecesario: boolean;
  forzarLogin?: boolean;
}

export interface AuthPort {
  cuentaActiva(): CuentaUsuario | null;
  rolesCacheados(): readonly Rol[];
  asegurarToken(opciones: OpcionesAsegurarToken): Promise<string>;
  cambiarCuenta(): Promise<void>;
  cerrarSesion(): Promise<void>;
}
