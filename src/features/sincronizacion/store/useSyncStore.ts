import { create } from 'zustand';

import type { EventoSync, ResumenSync } from '@/application/sync/eventosSync';
import type { ClaseError } from '@/domain/sync/errores';

/** Estado visible de un servicio durante la ejecución (ES-005-14). */
export type EstadoFilaSync = 'enCola' | 'subiendo' | 'listo' | 'error' | 'conflicto';

export interface ArchivoEnCurso {
  readonly adjuntoId: string;
  readonly nombre: string;
  readonly enviados: number;
  readonly totales: number;
}

export interface FilaSync {
  readonly servicioId: string;
  readonly codigo: string;
  readonly estado: EstadoFilaSync;
  readonly archivos: readonly ArchivoEnCurso[];
  readonly mensaje?: string;
  readonly clase?: ClaseError;
  /** Archivos que se esperan subir, si se conocía al preparar la cola. */
  readonly archivosEsperados?: number;
}

export interface DatosSync {
  readonly sincronizando: boolean;
  readonly ocupado: boolean;
  readonly total: number;
  readonly filas: readonly FilaSync[];
  readonly resumen: ResumenSync | null;
}

export interface EntradaCola {
  readonly servicioId: string;
  readonly codigo: string;
  readonly archivos?: number;
}

interface AccionesSync {
  /** Siembra la cola con lo que se va a subir, antes de llamar al motor. */
  preparar(cola: readonly EntradaCola[]): void;
  aplicar(evento: EventoSync): void;
  limpiarResumen(): void;
  reiniciar(): void;
}

export const ESTADO_INICIAL_SYNC: DatosSync = {
  sincronizando: false,
  ocupado: false,
  total: 0,
  filas: [],
  resumen: null,
};

/** Clases de error tras las cuales el motor devuelve el servicio a "pendiente". */
const CLASES_QUE_VUELVEN_A_COLA: ReadonlySet<ClaseError> = new Set(['RED', 'AUTH']);

const TERMINADOS: ReadonlySet<EstadoFilaSync> = new Set(['listo', 'error', 'conflicto']);

function actualizarFila(
  filas: readonly FilaSync[],
  servicioId: string,
  cambio: (fila: FilaSync) => FilaSync,
  codigo = ''
): FilaSync[] {
  const indice = filas.findIndex((fila) => fila.servicioId === servicioId);
  if (indice === -1) {
    return [...filas, cambio({ servicioId, codigo, estado: 'enCola', archivos: [] })];
  }
  return filas.map((fila, i) => (i === indice ? cambio(fila) : fila));
}

function sinMensaje(fila: FilaSync): FilaSync {
  const { mensaje: _mensaje, clase: _clase, ...resto } = fila;
  return resto;
}

/** Reductor puro: aplica un evento del motor al estado de la pantalla. */
export function reducirEventoSync(estado: DatosSync, evento: EventoSync): DatosSync {
  switch (evento.tipo) {
    case 'inicio':
      return {
        ...estado,
        sincronizando: true,
        ocupado: false,
        resumen: null,
        total: evento.total,
      };
    case 'servicio:inicio':
      return {
        ...estado,
        filas: actualizarFila(
          estado.filas,
          evento.servicioId,
          (fila) => ({ ...sinMensaje(fila), codigo: evento.codigo, estado: 'subiendo' }),
          evento.codigo
        ),
      };
    case 'archivo:progreso': {
      const archivo: ArchivoEnCurso = {
        adjuntoId: evento.adjuntoId,
        nombre: evento.nombreArchivo,
        enviados: evento.bytesEnviados,
        totales: evento.bytesTotales,
      };
      return {
        ...estado,
        filas: actualizarFila(estado.filas, evento.servicioId, (fila) => {
          const existe = fila.archivos.some((a) => a.adjuntoId === archivo.adjuntoId);
          return {
            ...fila,
            estado: 'subiendo',
            archivos: existe
              ? fila.archivos.map((a) => (a.adjuntoId === archivo.adjuntoId ? archivo : a))
              : [...fila.archivos, archivo],
          };
        }),
      };
    }
    case 'servicio:ok':
      return {
        ...estado,
        filas: actualizarFila(estado.filas, evento.servicioId, (fila) => ({
          ...sinMensaje(fila),
          estado: 'listo',
          archivos: fila.archivos.map((a) => ({ ...a, enviados: a.totales })),
        })),
      };
    case 'servicio:error':
      return {
        ...estado,
        filas: actualizarFila(estado.filas, evento.servicioId, (fila) => ({
          ...fila,
          estado: CLASES_QUE_VUELVEN_A_COLA.has(evento.clase) ? 'enCola' : 'error',
          mensaje: evento.mensaje,
          clase: evento.clase,
        })),
      };
    case 'conflicto':
      return {
        ...estado,
        filas: actualizarFila(estado.filas, evento.servicioId, (fila) => ({
          ...sinMensaje(fila),
          estado: 'conflicto',
        })),
      };
    case 'ocupado':
      return { ...estado, ocupado: true };
    case 'fin':
      return { ...estado, sincronizando: false, resumen: evento.resumen };
  }
}

/** Porcentaje de servicios terminados (listos, con error o en conflicto) de la ejecución. */
export function porcentajeEjecucion(estado: Pick<DatosSync, 'total' | 'filas'>): number {
  if (estado.total <= 0) return 0;
  const terminados = estado.filas.filter((fila) => TERMINADOS.has(fila.estado)).length;
  return Math.round((terminados / estado.total) * 100);
}

/** Progreso de la sincronización en curso (ADR-0005: Zustand para el progreso). */
export const useSyncStore = create<DatosSync & AccionesSync>((set) => ({
  ...ESTADO_INICIAL_SYNC,
  preparar: (cola) =>
    set({
      ...ESTADO_INICIAL_SYNC,
      filas: cola.map(({ servicioId, codigo, archivos }) => ({
        servicioId,
        codigo,
        estado: 'enCola',
        archivos: [],
        ...(archivos === undefined ? {} : { archivosEsperados: archivos }),
      })),
    }),
  aplicar: (evento) => set((estado) => reducirEventoSync(estado, evento)),
  limpiarResumen: () => set({ resumen: null, ocupado: false }),
  reiniciar: () => set({ ...ESTADO_INICIAL_SYNC }),
}));

interface FuenteEventos {
  on(listener: (evento: EventoSync) => void): () => void;
}

/** Conecta el store al bus de eventos del motor. Devuelve la función para desconectarlo. */
export function conectarSyncStore(bus: FuenteEventos): () => void {
  return bus.on((evento) => useSyncStore.getState().aplicar(evento));
}
