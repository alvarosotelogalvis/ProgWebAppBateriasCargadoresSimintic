export interface MetaRepository {
  obtener<T>(clave: string): Promise<T | undefined>;
  guardar(clave: string, valor: unknown): Promise<void>;
  dispositivoId(): Promise<string>;
}
