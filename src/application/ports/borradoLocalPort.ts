/** Borrado total de los datos locales (restablecer la app). */
export interface BorradoLocalPort {
  contarLogs(): Promise<number>;
  /** Vacía servicios, adjuntos y registros en una sola transacción. */
  vaciarTodo(): Promise<void>;
}
