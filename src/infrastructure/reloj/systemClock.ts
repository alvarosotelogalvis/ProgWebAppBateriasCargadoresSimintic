import type { Clock } from '@/application/ports/clock';
import { fechaLocalHoy } from '@/domain/validaciones';

export class SystemClock implements Clock {
  ahoraIso(): string {
    return new Date().toISOString();
  }

  fechaHoyIso(): string {
    return fechaLocalHoy();
  }
}
