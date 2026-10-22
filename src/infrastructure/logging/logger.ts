import type { ContextoLog, Logger } from '@/application/ports/loggerPort';
import type { AppDB, EntradaLog } from '@/infrastructure/db/dexie';

const MAX_ENTRADAS = 2000;

const CLAVES_SENSIBLES = [
  'token',
  'accesstoken',
  'idtoken',
  'refreshtoken',
  'authorization',
  'password',
  'secret',
  'blob',
  'miniatura',
  'archivo',
  'file',
];

const esSensible = (clave: string): boolean => {
  const normalizada = clave.toLowerCase().replace(/[_-]/g, '');
  return CLAVES_SENSIBLES.some((sensible) => normalizada.includes(sensible));
};

const limpiar = (valor: unknown, profundidad = 0): unknown => {
  if (profundidad > 4) return '[profundidad-maxima]';
  if (valor === null || valor === undefined) return valor;
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
    return valor;
  }
  if (typeof Blob !== 'undefined' && valor instanceof Blob) return '[blob]';
  if (Array.isArray(valor)) return valor.map((elemento) => limpiar(elemento, profundidad + 1));
  if (typeof valor === 'object') {
    const resultado: Record<string, unknown> = {};
    for (const [clave, contenido] of Object.entries(valor as Record<string, unknown>)) {
      if (esSensible(clave)) continue;
      resultado[clave] = limpiar(contenido, profundidad + 1);
    }
    return resultado;
  }
  return String(valor);
};

export class LoggerDexie implements Logger {
  private cola: Promise<void> = Promise.resolve();

  constructor(
    private readonly db: AppDB,
    private readonly appVersion: string = typeof __APP_VERSION__ === 'string'
      ? __APP_VERSION__
      : '0.0.0'
  ) {}

  debug(evento: string, datos?: Record<string, unknown>, ctx?: ContextoLog): void {
    this.registrar('debug', evento, datos, ctx);
  }

  info(evento: string, datos?: Record<string, unknown>, ctx?: ContextoLog): void {
    this.registrar('info', evento, datos, ctx);
  }

  warn(evento: string, datos?: Record<string, unknown>, ctx?: ContextoLog): void {
    this.registrar('warn', evento, datos, ctx);
  }

  error(evento: string, datos?: Record<string, unknown>, ctx?: ContextoLog): void {
    this.registrar('error', evento, datos, ctx);
  }

  /** Espera a que se escriban todas las entradas pendientes (pruebas y cierre de la app). */
  async vaciar(): Promise<void> {
    await this.cola;
  }

  private registrar(
    nivel: EntradaLog['nivel'],
    evento: string,
    datos?: Record<string, unknown>,
    ctx?: ContextoLog
  ): void {
    const entrada: EntradaLog = {
      ts: new Date().toISOString(),
      nivel,
      evento,
      appVersion: this.appVersion,
    };
    if (datos) entrada.datos = limpiar(datos) as Record<string, unknown>;
    if (ctx?.correlationId) entrada.correlationId = ctx.correlationId;
    if (ctx?.clientRequestId) entrada.clientRequestId = ctx.clientRequestId;

    if (import.meta.env.DEV) {
      if (nivel === 'error') console.error(`[${evento}]`, entrada.datos ?? '');
      else if (nivel === 'warn') console.warn(`[${evento}]`, entrada.datos ?? '');
    }

    this.encolar(() => this.persistir(entrada));
  }

  private encolar(tarea: () => Promise<void>): void {
    this.cola = this.cola.then(tarea).catch(() => undefined);
  }

  private async persistir(entrada: EntradaLog): Promise<void> {
    await this.db.logs.add(entrada);
    const total = await this.db.logs.count();
    if (total <= MAX_ENTRADAS) return;
    const exceso = total - MAX_ENTRADAS;
    const claves = await this.db.logs.orderBy('seq').limit(exceso).primaryKeys();
    if (claves.length > 0) await this.db.logs.bulkDelete(claves);
  }
}

let manejadoresInstalados = false;

export const instalarManejadoresGlobales = (logger: Logger): void => {
  if (typeof window === 'undefined' || manejadoresInstalados) return;
  manejadoresInstalados = true;

  window.addEventListener('error', (evento) => {
    logger.error('window.error', {
      mensaje: evento.message,
      archivo: evento.filename,
      linea: evento.lineno,
      columna: evento.colno,
    });
  });

  window.addEventListener('unhandledrejection', (evento) => {
    logger.error('window.unhandledrejection', {
      motivo: evento.reason instanceof Error ? evento.reason.message : String(evento.reason),
    });
  });
};
