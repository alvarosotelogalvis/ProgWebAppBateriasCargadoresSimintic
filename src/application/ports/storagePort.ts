export interface EstimacionAlmacenamiento {
  readonly usadoBytes: number;
  readonly cuotaBytes: number;
  readonly disponibleBytes: number;
  readonly porcentajeUsado: number;
}

export interface StoragePort {
  estimar(): Promise<EstimacionAlmacenamiento>;
  persistir(): Promise<boolean>;
}
