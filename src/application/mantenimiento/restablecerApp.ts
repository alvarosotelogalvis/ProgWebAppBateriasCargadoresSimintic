import type { AppDB } from '@/infrastructure/db/dexie';

export class ErrorRestablecimiento extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorRestablecimiento';
  }
}

export interface ResultadoRestablecimiento {
  serviciosEliminados: number;
  adjuntosEliminados: number;
  logsEliminados: number;
  timestamp: string;
}

export async function restablecerApp(db: AppDB): Promise<ResultadoRestablecimiento> {
  // Nada que no esté ya en SharePoint se puede perder: borradores, pendientes, con error o en
  // conflicto bloquean el restablecimiento (regla de oro: nunca perder datos locales).
  const servicios = await db.servicios.toArray();
  const adjuntos = await db.adjuntos.toArray();
  const sinSincronizar =
    servicios.filter((s) => s.syncState !== 'synced').length +
    adjuntos.filter((a) => a.syncState !== 'synced' || a.eliminarRemoto).length;

  if (sinSincronizar > 0) {
    throw new ErrorRestablecimiento(
      `No se puede restablecer con ${sinSincronizar} elemento(s) sin sincronizar`
    );
  }

  // Contar antes de eliminar
  const logsTotal = await db.logs.count();

  // Ejecutar borrado en transacción
  await db.transaction('rw', db.servicios, db.adjuntos, db.logs, async () => {
    await db.servicios.clear();
    await db.adjuntos.clear();
    await db.logs.clear();
  });

  return {
    serviciosEliminados: servicios.length,
    adjuntosEliminados: adjuntos.length,
    logsEliminados: logsTotal,
    timestamp: new Date().toISOString(),
  };
}
