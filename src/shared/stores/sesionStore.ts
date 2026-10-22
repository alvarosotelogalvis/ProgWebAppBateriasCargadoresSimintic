import { create } from 'zustand';

export type Rol = 'Tecnico' | 'Comercial' | 'Administrador';

export interface CuentaUsuario {
  readonly id: string;
  readonly nombre: string;
  readonly correo: string;
  readonly roles: readonly Rol[];
}

interface EstadoSesion {
  readonly cuenta: CuentaUsuario | null;
  readonly roles: readonly Rol[];
  readonly configuracionInicialCompleta: boolean;
  setCuenta(cuenta: CuentaUsuario | null): void;
  setConfiguracionInicialCompleta(valor: boolean): void;
}

/**
 * Sesion simulada en esta spec. La spec 004 reemplaza la fuente por el AuthPort real
 * sin cambiar la interfaz de este store (plan 001, seccion 3.4).
 */
export const useSesionStore = create<EstadoSesion>((set) => ({
  cuenta: {
    id: 'mock-local',
    nombre: 'Tecnico Demo',
    correo: 'tecnico.demo@empresa.com',
    roles: ['Tecnico', 'Comercial', 'Administrador'],
  },
  roles: ['Tecnico', 'Comercial', 'Administrador'],
  configuracionInicialCompleta: true,
  setCuenta: (cuenta) => set({ cuenta, roles: cuenta ? cuenta.roles : [] }),
  setConfiguracionInicialCompleta: (valor) => set({ configuracionInicialCompleta: valor }),
}));
