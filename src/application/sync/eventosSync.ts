import type { ClaseError } from '@/domain/sync/errores';

export type ResultadoSync = 'OK' | 'Parcial' | 'Error';

export interface ResumenSync {
  readonly subidos: number;
  readonly archivos: number;
  readonly errores: number;
  readonly conflictos: number;
  readonly resultado: ResultadoSync;
  /** `true` cuando otra ventana tenía el lock de sincronización. */
  readonly ocupado?: boolean;
}

export type EventoSync =
  | { readonly tipo: 'inicio'; readonly correlationId: string; readonly total: number }
  | { readonly tipo: 'servicio:inicio'; readonly servicioId: string; readonly codigo: string }
  | {
      readonly tipo: 'archivo:progreso';
      readonly servicioId: string;
      readonly adjuntoId: string;
      readonly nombreArchivo: string;
      readonly bytesEnviados: number;
      readonly bytesTotales: number;
    }
  | { readonly tipo: 'servicio:ok'; readonly servicioId: string; readonly archivosSubidos: number }
  | {
      readonly tipo: 'servicio:error';
      readonly servicioId: string;
      readonly clase: ClaseError;
      readonly mensaje: string;
      readonly error?: unknown;
    }
  | {
      readonly tipo: 'conflicto';
      readonly servicioId: string;
      readonly campos: readonly string[];
    }
  | { readonly tipo: 'ocupado' }
  | { readonly tipo: 'fin'; readonly resumen: ResumenSync };

export type TipoEventoSync = EventoSync['tipo'];

type Escucha = (evento: EventoSync) => void;

export class EventBusSync {
  private escuchas: Escucha[] = [];

  on(listener: Escucha): () => void {
    this.escuchas.push(listener);
    return () => {
      this.escuchas = this.escuchas.filter((escucha) => escucha !== listener);
    };
  }

  suscribir(listener: Escucha): () => void {
    return this.on(listener);
  }

  emitir(evento: EventoSync): void {
    for (const escucha of [...this.escuchas]) {
      try {
        escucha(evento);
      } catch {
        // Una escucha defectuosa no debe interrumpir la sincronización.
      }
    }
  }
}

/** Bus global usado por la UI (se reemplaza por una instancia en pruebas). */
export const eventosSync = new EventBusSync();
