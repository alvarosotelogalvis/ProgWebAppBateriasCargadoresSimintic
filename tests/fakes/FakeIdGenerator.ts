export class FakeIdGenerator {
  private contador = 0
  private ids: string[] = []

  siguiente = (): string => {
    this.contador += 1
    const id = this.ids[this.contador - 1] ?? `00000000-0000-4000-8000-${String(this.contador).padStart(12, '0')}`
    return id
  }

  predefinir = (ids: string[]): void => {
    this.ids = ids
  }
}
