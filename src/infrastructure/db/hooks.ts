import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import type { Servicio } from '@/domain/servicio';

import { AppDB } from './dexie';
import { sincronizarContadorPendientes } from './sincronizarContadorPendientes';

export const dbApp = new AppDB();

const listarPendientes = async (db: AppDB): Promise<Servicio[]> => {
  const servicios = await db.servicios
    .where('syncState')
    .anyOf('pending', 'error', 'conflict')
    .toArray();
  return servicios.filter((servicio) => servicio.estado !== 'BORRADOR');
};

const contarPendientes = async (db: AppDB): Promise<number> => (await listarPendientes(db)).length;

export interface ResumenAntiguedadPendientes {
  readonly cantidad: number;
  /** `actualizadoEn` del pendiente más antiguo. */
  readonly masAntiguoEn?: string;
}

export const calcularAntiguedadPendientes = async (
  db: AppDB
): Promise<ResumenAntiguedadPendientes> => {
  const pendientes = await listarPendientes(db);
  const masAntiguo = pendientes.reduce<string | undefined>(
    (min, s) => (min === undefined || s.actualizadoEn < min ? s.actualizadoEn : min),
    undefined
  );
  return { cantidad: pendientes.length, ...(masAntiguo ? { masAntiguoEn: masAntiguo } : {}) };
};

const SIN_PENDIENTES: ResumenAntiguedadPendientes = { cantidad: 0 };

export const useAntiguedadPendientes = (db: AppDB = dbApp): ResumenAntiguedadPendientes =>
  useLiveQuery(() => calcularAntiguedadPendientes(db), [db], SIN_PENDIENTES) ?? SIN_PENDIENTES;

export interface ItemColaSync {
  readonly id: string;
  readonly codigo: string;
  readonly descripcion: string;
  readonly syncState: Servicio['syncState'];
  readonly intentos: number;
  readonly ultimoError?: Servicio['ultimoError'];
}

export interface ColaSync {
  readonly total: number;
  readonly sincronizados: number;
  readonly enCola: readonly ItemColaSync[];
  readonly conError: readonly ItemColaSync[];
  readonly conflictos: readonly ItemColaSync[];
}

const COLA_VACIA: ColaSync = {
  total: 0,
  sincronizados: 0,
  enCola: [],
  conError: [],
  conflictos: [],
};

const aItemCola = (servicio: Servicio): ItemColaSync => ({
  id: servicio.id,
  codigo: servicio.codigo,
  descripcion: [servicio.clienteNombre, servicio.marca].filter(Boolean).join(' · '),
  syncState: servicio.syncState,
  intentos: servicio.intentos,
  ...(servicio.ultimoError ? { ultimoError: servicio.ultimoError } : {}),
});

/** Cola de sincronización para la pantalla de Sincronización (referencia 07). */
export const calcularColaSync = async (db: AppDB): Promise<ColaSync> => {
  const servicios = (await db.servicios.toArray()).filter((s) => s.estado !== 'BORRADOR');
  const porEstado = (...estados: Servicio['syncState'][]) =>
    servicios
      .filter((s) => estados.includes(s.syncState))
      .sort((a, b) => a.actualizadoEn.localeCompare(b.actualizadoEn))
      .map(aItemCola);
  return {
    total: servicios.length,
    sincronizados: servicios.filter((s) => s.syncState === 'synced').length,
    enCola: porEstado('pending', 'syncing', 'local'),
    conError: porEstado('error'),
    conflictos: porEstado('conflict'),
  };
};

export const useColaSync = (db: AppDB = dbApp): ColaSync =>
  useLiveQuery(() => calcularColaSync(db), [db], COLA_VACIA) ?? COLA_VACIA;

export const useServicios = (db: AppDB = dbApp) =>
  useLiveQuery(() => db.servicios.orderBy('actualizadoEn').reverse().toArray(), [db], []);

export const useServicio = (id: string, db: AppDB = dbApp) =>
  useLiveQuery(() => db.servicios.get(id), [db, id]);

export const useAdjuntos = (servicioId: string, db: AppDB = dbApp) =>
  useLiveQuery(
    () => db.adjuntos.where('servicioId').equals(servicioId).toArray(),
    [db, servicioId],
    []
  );

export const useCatalogo = <T>(clave: string, db: AppDB = dbApp): T | undefined => {
  const registro = useLiveQuery(() => db.catalogos.get(clave), [db, clave]);
  return registro?.valor as T | undefined;
};

export const usePendientes = (db: AppDB = dbApp): number => {
  const pendientes = useLiveQuery(() => contarPendientes(db), [db], 0) ?? 0;

  useEffect(() => {
    sincronizarContadorPendientes(pendientes);
  }, [pendientes]);

  return pendientes;
};
