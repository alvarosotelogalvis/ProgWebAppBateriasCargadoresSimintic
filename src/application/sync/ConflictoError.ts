export interface DetalleConflicto {
  readonly itemId?: string;
  readonly campos?: readonly string[];
}

/** 412 de SharePoint: el ítem remoto cambió desde la última lectura (SDD §9.5). */
export class ConflictoError extends Error {
  readonly itemId: string | undefined;
  readonly campos: readonly string[];

  constructor(
    message = 'El servicio cambió en SharePoint desde la última sincronización.',
    detalle: DetalleConflicto = {}
  ) {
    super(message);
    this.name = 'ConflictoError';
    this.itemId = detalle.itemId;
    this.campos = detalle.campos ?? [];
  }
}
