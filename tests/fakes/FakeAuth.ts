import type { AuthPort } from '@/application/ports/authPort'

export class FakeAuth implements AuthPort {
  private cuenta: string | null = null

  iniciarSesion = async (): Promise<void> => {
    this.cuenta = 'tecnico@ejemplo.com'
  }

  cerrarSesion = async (): Promise<void> => {
    this.cuenta = null
  }

  obtenerCuenta = (): string | null => this.cuenta

  estaAutenticado = (): boolean => this.cuenta !== null
}
