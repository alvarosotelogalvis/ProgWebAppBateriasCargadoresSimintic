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
  // Verificar que no hay pendientes
  const servicios = await db.servicios.toArray();
  const conPendientes = servicios.filter((s) => s.syncState === 'pending');

  if (conPendientes.length > 0) {
    throw new ErrorRestablecimiento(
      `No se puede restablecer con ${conPendientes.length} servicio(s) pendiente(s)`
    );
  }

  // Contar antes de eliminar
  const adjuntos = await db.adjuntos.toArray();
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
