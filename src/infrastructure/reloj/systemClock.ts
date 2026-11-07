import type { Clock } from '@/application/ports/clock';
import { fechaLocalHoy } from '@/domain/validaciones';

export class SystemClock implements Clock {
  ahoraIso(): string {
    return new Date().toISOString();
  }

  ahoraMs(): number {
    return Date.now();
  }

  fechaHoyIso(): string {
    return fechaLocalHoy();
  }
}
