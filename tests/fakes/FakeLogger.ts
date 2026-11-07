import type { ContextoLog, Logger } from '@/application/ports/loggerPort';

export interface EventoLog {
  nivel: 'debug' | 'info' | 'warn' | 'error';
  evento: string;
  datos?: Record<string, unknown>;
  ctx?: ContextoLog;
}

export class FakeLogger implements Logger {
  eventos: EventoLog[] = [];

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

  get errores(): EventoLog[] {
    return this.eventos.filter((evento) => evento.nivel === 'error');
  }

  get advertencias(): EventoLog[] {
    return this.eventos.filter((evento) => evento.nivel === 'warn');
  }

  limpiar(): void {
    this.eventos = [];
  }

  private registrar(
    nivel: EventoLog['nivel'],
    evento: string,
    datos?: Record<string, unknown>,
    ctx?: ContextoLog
  ): void {
    const entrada: EventoLog = { nivel, evento };
    if (datos) entrada.datos = datos;
    if (ctx) entrada.ctx = ctx;
    this.eventos.push(entrada);
  }
}
