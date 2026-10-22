import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { AppDB } from './dexie';
import { sincronizarContadorPendientes } from './sincronizarContadorPendientes';

export const dbApp = new AppDB();

const contarPendientes = async (db: AppDB): Promise<number> => {
  const servicios = await db.servicios
    .where('syncState')
    .anyOf('pending', 'error', 'conflict')
    .toArray();
  return servicios.filter((servicio) => servicio.estado !== 'BORRADOR').length;
};

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
