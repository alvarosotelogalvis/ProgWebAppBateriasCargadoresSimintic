export interface CatalogoRepository {
  obtener<T>(clave: string): Promise<T | undefined>;
  guardar(clave: string, valor: unknown): Promise<void>;
}
