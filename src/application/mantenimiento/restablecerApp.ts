import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { BorradoLocalPort } from '@/application/ports/borradoLocalPort';
import type { ServicioRepository } from '@/application/ports/servicioRepository';

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

export interface DepsRestablecerApp {
  readonly servicios: ServicioRepository;
  readonly adjuntos: AdjuntoRepository;
  readonly borrado: BorradoLocalPort;
}

export async function restablecerApp(deps: DepsRestablecerApp): Promise<ResultadoRestablecimiento> {
  // Nada que no esté ya en SharePoint se puede perder: borradores, pendientes, con error o en
  // conflicto bloquean el restablecimiento (regla de oro: nunca perder datos locales).
  const servicios = await deps.servicios.listarTodos();
  const adjuntos = await deps.adjuntos.listarTodos();
  const sinSincronizar =
    servicios.filter((s) => s.syncState !== 'synced').length +
    adjuntos.filter((a) => a.syncState !== 'synced' || a.eliminarRemoto).length;

  if (sinSincronizar > 0) {
    throw new ErrorRestablecimiento(
      `No se puede restablecer con ${sinSincronizar} elemento(s) sin sincronizar`
    );
  }

  // Contar antes de eliminar
  const logsTotal = await deps.borrado.contarLogs();

  // Una sola transacción para los tres almacenes
  await deps.borrado.vaciarTodo();

  return {
    serviciosEliminados: servicios.length,
    adjuntosEliminados: adjuntos.length,
    logsEliminados: logsTotal,
    timestamp: new Date().toISOString(),
  };
}
