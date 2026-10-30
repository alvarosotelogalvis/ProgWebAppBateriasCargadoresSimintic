import { create } from 'zustand';

import type { CuentaUsuario, Rol } from '@/domain/servicio';

export type { CuentaUsuario, Rol } from '@/domain/servicio';

interface EstadoSesion {
  readonly cuenta: CuentaUsuario | null;
  readonly roles: readonly Rol[];
  readonly configuracionInicialCompleta: boolean;
  setCuenta(cuenta: CuentaUsuario | null): void;
  setConfiguracionInicialCompleta(valor: boolean): void;
}

/**
 * La fuente es AuthPort; el container hidrata este store al arrancar (spec 004).
 */
export const useSesionStore = create<EstadoSesion>((set) => ({
  cuenta: null,
  roles: [],
  configuracionInicialCompleta: false,
  setCuenta: (cuenta) => set({ cuenta, roles: cuenta ? cuenta.roles : [] }),
  setConfiguracionInicialCompleta: (valor) => set({ configuracionInicialCompleta: valor }),
}));
