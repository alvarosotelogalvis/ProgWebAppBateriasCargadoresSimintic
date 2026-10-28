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
