export interface IntencionSync {
  readonly cuenta: { readonly username: string; readonly nombre?: string; readonly homeAccountId?: string };
  readonly timestamp: number;
  readonly returnUrl?: string;
}

export interface IntencionSyncPort {
  guardar(intencion: IntencionSync): void;
  leer(): IntencionSync | null;
  limpiar(): void;
}

export class IntencionSyncSessionStorage implements IntencionSyncPort {
  private readonly clave = 'sync:intencion';

  guardar(intencion: IntencionSync): void {
    try {
      sessionStorage.setItem(this.clave, JSON.stringify(intencion));
    } catch {
      // ignorar
    }
  }

  leer(): IntencionSync | null {
    try {
      const raw = sessionStorage.getItem(this.clave);
      if (!raw) return null;
      return JSON.parse(raw) as IntencionSync;
    } catch {
      return null;
    }
  }

  limpiar(): void {
    try {
      sessionStorage.removeItem(this.clave);
    } catch {
      // ignorar
    }
  }
}
