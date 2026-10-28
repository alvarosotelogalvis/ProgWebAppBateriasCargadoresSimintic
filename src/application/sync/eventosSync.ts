export type TipoEventoSync =
  | { tipo: 'inicio' }
  | { tipo: 'progreso'; completados: number; total: number; servicioId?: string }
  | { tipo: 'servicioCompletado'; servicioId: string }
  | { tipo: 'error'; servicioId?: string; error: any }
  | { tipo: 'fin'; resumen: any };

export class EventBusSync {
  private listeners: Array<(evento: TipoEventoSync) => void> = [];

  suscribir(listener: (evento: TipoEventoSync) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emitir(evento: TipoEventoSync): void {
    for (const listener of this.listeners) {
      try {
        listener(evento);
      } catch {
        // ignorar
      }
    }
  }
}

export const eventosSync = new EventBusSync();
