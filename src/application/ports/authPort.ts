export interface AuthPort {
  obtenerCuenta(): string | null
  estaAutenticado(): boolean
}
