export interface ContextoLog {
  correlationId?: string;
  clientRequestId?: string;
}

export interface Logger {
  debug(evento: string, datos?: Record<string, unknown>, ctx?: ContextoLog): void;
  info(evento: string, datos?: Record<string, unknown>, ctx?: ContextoLog): void;
  warn(evento: string, datos?: Record<string, unknown>, ctx?: ContextoLog): void;
  error(evento: string, datos?: Record<string, unknown>, ctx?: ContextoLog): void;
}

export type LoggerPort = Logger;
