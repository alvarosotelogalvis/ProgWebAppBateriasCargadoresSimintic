import type { Clock } from '@/application/ports/clock';
import { fechaLocalHoy } from '@/domain/validaciones';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export class FakeClock implements Clock {
  private ahora: Date;

  constructor(ahora = new Date('2026-10-21T08:00:00.000Z')) {
    this.ahora = ahora;
  }

  ahoraMs = (): number => this.ahora.getTime();
  ahoraIso = (): string => this.ahora.toISOString();
  fechaHoyIso = (): string => fechaLocalHoy(this.ahora);
  avanzarMs = (ms: number): void => {
    this.ahora = new Date(this.ahora.getTime() + ms);
  };
  avanzarDias = (dias: number): void => {
    this.avanzarMs(dias * MS_POR_DIA);
  };
  fijar = (fecha: Date): void => {
    this.ahora = fecha;
  };
}
