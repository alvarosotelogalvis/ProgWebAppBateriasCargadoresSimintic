import { conLockSync } from '@/infrastructure/sync/webLocks';
import { AppError } from '@/shared/errors';

export interface SyncEngineDeps {
  readonly db?: any;
  readonly remoto?: any;
  readonly auth?: any;
  readonly logger?: any;
}

export class SyncEngine {
  private abortController: AbortController | null = null;

  constructor(private readonly deps: SyncEngineDeps) {}

  async iniciar(): Promise<void> {
    if (this.abortController) return;
    this.abortController = new AbortController();
    await conLockSync('sync-global', async () => {
      // Precondiciones simplificadas
      await this.ejecutarPush();
    });
  }

  cancelar(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  private async ejecutarPush(): Promise<void> {
    // Implementación base - se ampliará según necesidades
  }

  async despuesDelPush(): Promise<void> {}
  async alFinalizar(): Promise<void> {}
}
