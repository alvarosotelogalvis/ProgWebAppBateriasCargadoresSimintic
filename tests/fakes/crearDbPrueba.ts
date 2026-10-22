import 'fake-indexeddb/auto';
import { AppDB } from '@/infrastructure/db/dexie';

let contador = 0;

export const crearDbPrueba = async (nombre?: string): Promise<AppDB> => {
  contador += 1;
  const db = new AppDB(nombre ?? `test-db-${Date.now()}-${contador}`);
  await db.open();
  return db;
};
