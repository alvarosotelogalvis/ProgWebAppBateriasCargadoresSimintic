import type { ServicioRepository } from '@/application/ports/servicioRepository';
import { BorradorNoEliminableError } from '@/domain/errores';
import { normalizarSerie } from '@/domain/normalizacion';
import type { Servicio } from '@/domain/servicio';
import { esFinal } from '@/domain/estados';
import type { AppDB } from './dexie';

export class ServicioRepositoryDexie implements ServicioRepository {
  constructor(private readonly db: AppDB) {}

  async obtener(id: string): Promise<Servicio | undefined> {
    return this.db.servicios.get(id);
  }

  async guardar(servicio: Servicio): Promise<void> {
    await this.db.servicios.put(servicio);
  }

  async listarPendientes(): Promise<Servicio[]> {
    const servicios = await this.db.servicios
      .where('syncState')
      .anyOf('pending', 'error', 'conflict')
      .toArray();
    return servicios.filter((servicio) => servicio.estado !== 'BORRADOR');
  }

  async listarTodos(): Promise<Servicio[]> {
    return this.db.servicios.toArray();
  }

  async buscarPorSpItemId(itemId: string): Promise<Servicio | undefined> {
    return this.db.servicios.where('sp.itemId').equals(itemId).first();
  }

  async buscarPorSerie(serie: string): Promise<Servicio[]> {
    return this.db.servicios.where('serie').equals(normalizarSerie(serie)).toArray();
  }

  async eliminarBorrador(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.servicios, async () => {
      const servicio = await this.db.servicios.get(id);
      if (!servicio) return;
      if (servicio.estado !== 'BORRADOR') {
        throw new BorradorNoEliminableError(id);
      }
      await this.db.servicios.delete(id);
    });
  }

  async eliminarSincronizado(id: string): Promise<boolean> {
    return this.db.transaction('rw', this.db.servicios, this.db.adjuntos, async () => {
      const servicio = await this.db.servicios.get(id);
      if (!servicio) return false;
      if (servicio.syncState !== 'synced' || servicio.camposSucios.length > 0) return false;
      const pendientes = await this.db.adjuntos
        .where('servicioId')
        .equals(id)
        .filter((adjunto) => adjunto.syncState !== 'synced' || adjunto.eliminarRemoto)
        .count();
      if (pendientes > 0) return false;
      await this.db.adjuntos.where('servicioId').equals(id).delete();
      await this.db.servicios.delete(id);
      return true;
    });
  }

  async purgarCerrados(antesDe: string): Promise<number> {
    return this.db.transaction('rw', this.db.servicios, this.db.adjuntos, async () => {
      const candidatos = await this.db.servicios
        .where('syncState')
        .equals('synced')
        .filter(
          (servicio) =>
            servicio.estado !== 'BORRADOR' &&
            esFinal(servicio.estado) &&
            servicio.actualizadoEn < antesDe
        )
        .toArray();

      if (candidatos.length === 0) return 0;

      const ids = candidatos.map((servicio) => servicio.id);
      await this.db.adjuntos.where('servicioId').anyOf(ids).delete();
      await this.db.servicios.bulkDelete(ids);
      return ids.length;
    });
  }
}
