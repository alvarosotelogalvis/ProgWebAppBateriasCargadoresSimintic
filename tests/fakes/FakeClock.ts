export class FakeClock {
  private ahora: Date

  constructor(ahora = new Date('2026-10-21T08:00:00.000Z')) {
    this.ahora = ahora
  }

  ahoraMs = (): number => this.ahora.getTime()
  ahoraIso = (): string => this.ahora.toISOString()
  fechaHoyIso = (): string => this.ahora.toISOString().slice(0, 10)
  avanzarMs = (ms: number): void => {
    this.ahora = new Date(this.ahora.getTime() + ms)
  }
  fijar = (fecha: Date): void => {
    this.ahora = fecha
  }
}
