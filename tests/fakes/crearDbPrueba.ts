import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { AppDB, ESQUEMA_V1 } from '@/infrastructure/db/dexie'

export const crearDbPrueba = async (nombre?: string): Promise<AppDB> => {
  const db = new AppDB()
  db.name = nombre ?? `test-db-${Math.random().toString(36).slice(2)}`
  // Dexie usa el esquema definido; fake-indexeddb permite recrear por instancia
  // Asegurar estado limpio
  try {
    await db.delete()
  } catch {
    // ignorar
  }
  await db.open()
  return db
}
