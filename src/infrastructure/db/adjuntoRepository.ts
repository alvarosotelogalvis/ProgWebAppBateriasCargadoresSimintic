import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { Adjunto } from '@/domain/adjunto';
import type { TipoAdjunto } from '@/domain/servicio';
import type { AppDB } from './dexie';

export class AdjuntoRepositoryDexie implements AdjuntoRepository {
  constructor(private readonly db: AppDB) {}

  async obtener(id: string): Promise<Adjunto | undefined> {
    return this.db.adjuntos.get(id);
  }

  async listarPorServicio(servicioId: string): Promise<Adjunto[]> {
    return this.db.adjuntos.where('servicioId').equals(servicioId).toArray();
  }

  async listarTodos(): Promise<Adjunto[]> {
    return this.db.adjuntos.toArray();
  }

  async buscarPorHash(
    servicioId: string,
    tipo: TipoAdjunto,
    sha256: string
  ): Promise<Adjunto | undefined> {
    return this.db.adjuntos
      .where('[servicioId+tipo]')
      .equals([servicioId, tipo])
      .filter((adjunto) => adjunto.sha256 === sha256)
      .first();
  }

  async guardar(adjunto: Adjunto): Promise<void> {
    await this.db.adjuntos.put(adjunto);
  }

  async eliminarLocal(id: string): Promise<void> {
    await this.db.adjuntos.delete(id);
  }

  async eliminarPorServicio(servicioId: string): Promise<number> {
    return this.db.adjuntos.where('servicioId').equals(servicioId).delete();
  }

  async marcarPendientes(servicioId: string): Promise<number> {
    return this.db.transaction('rw', this.db.adjuntos, async () => {
      const locales = await this.db.adjuntos
        .where('servicioId')
        .equals(servicioId)
        .filter((adjunto) => adjunto.syncState === 'local')
        .toArray();
      if (locales.length === 0) return 0;
      await this.db.adjuntos.bulkPut(
        locales.map((adjunto) => ({ ...adjunto, syncState: 'pending' }))
      );
      return locales.length;
    });
  }

  async purgarOriginales(sincronizadosAntesDe: string): Promise<number> {
    return this.db.transaction('rw', this.db.adjuntos, async () => {
      const candidatos = await this.db.adjuntos
        .where('syncState')
        .equals('synced')
        .filter((adjunto) => {
          if (adjunto.blob === null) return false;
          const fecha = adjunto.sincronizadoEn ?? adjunto.capturadoEn;
          return fecha < sincronizadosAntesDe;
        })
        .toArray();

      for (const adjunto of candidatos) {
        await this.db.adjuntos.update(adjunto.id, { blob: null });
      }
      return candidatos.length;
    });
  }
}
