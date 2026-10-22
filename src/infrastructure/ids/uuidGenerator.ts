import type { IdGenerator } from '@/application/ports/idGenerator';

export class UuidGenerator implements IdGenerator {
  siguiente(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    throw new Error('crypto.randomUUID no está disponible en este navegador');
  }
}
