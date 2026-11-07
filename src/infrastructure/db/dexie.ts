import Dexie, { type Table } from 'dexie';

import type { Adjunto } from '@/domain/adjunto';
import type { Servicio } from '@/domain/servicio';
import { traducirErrorDb } from '@/shared/errors';

export interface EntradaLog {
  seq?: number;
  ts: string;
  nivel: 'debug' | 'info' | 'warn' | 'error';
  evento: string;
  datos?: Record<string, unknown>;
  correlationId?: string;
  clientRequestId?: string;
  appVersion?: string;
}

export interface CatalogoLocal {
  clave: string;
  valor: unknown;
  actualizadoEn: string;
}

export interface MetaLocal {
  clave: string;
  valor: unknown;
}

export const ESQUEMA_V1 = {
  servicios:
    'id, estado, syncState, serie, numeroSolicitud, clienteId, fechaRecepcion, proyeccionVidaUtil, actualizadoEn, sp.itemId',
  adjuntos: 'id, servicioId, [servicioId+tipo], syncState',
  catalogos: 'clave',
  meta: 'clave',
  logs: '++seq, ts, nivel',
} as const;

export const NOMBRE_DB = 'servicio-tecnico-bc';

export class AppDB extends Dexie {
  servicios!: Table<Servicio, string>;
  adjuntos!: Table<Adjunto, string>;
  catalogos!: Table<CatalogoLocal, string>;
  meta!: Table<MetaLocal, string>;
  logs!: Table<EntradaLog, number>;

  constructor(nombre: string = NOMBRE_DB) {
    super(nombre);
    this.version(1).stores(ESQUEMA_V1);
  }

  async abrir(): Promise<this> {
    try {
      await this.open();
      return this;
    } catch (error) {
      throw traducirErrorDb(error);
    }
  }
}
