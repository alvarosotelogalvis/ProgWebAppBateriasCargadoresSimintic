import type { AppDB } from '@/infrastructure/db/dexie';
import type { Adjunto } from '@/domain/adjunto';
import { seleccionarPurgables, calcularEspacioLiberado } from '@/domain/purgas';

export interface ResultadoPurga {
  serviciosPurgados: string[];
  adjuntosPurgados: string[];
  espacioLiberado: number;
  timestamp: string;
}

export async function ejecutarPurgas(
  db: AppDB,
  diasOriginales: number = 7,
  mesesCerrados: number = 3
): Promise<ResultadoPurga> {
  // Cargar datos locales
  const servicios = await db.servicios.toArray();
  const adjuntos = await db.adjuntos.toArray();

  // Mapear adjuntos por servicio
  const adjuntosMap = new Map<string, Adjunto[]>();
  for (const adj of adjuntos) {
    if (!adjuntosMap.has(adj.servicioId)) {
      adjuntosMap.set(adj.servicioId, []);
    }
    adjuntosMap.get(adj.servicioId)!.push(adj);
  }

  // Seleccionar qué purgar
  const purgables = seleccionarPurgables(servicios, adjuntosMap, diasOriginales, mesesCerrados);
  const espacioLiberado = calcularEspacioLiberado(purgables);

  const serviciosPurgados: string[] = [];
  const adjuntosPurgados: string[] = [];

  // Ejecutar purgas en transacción (Dexie.transaction)
  await db.transaction('rw', db.servicios, db.adjuntos, async () => {
    // Eliminar servicios purgables
    for (const svc of purgables.servicios) {
      await db.servicios.delete(svc.id);
      serviciosPurgados.push(svc.id);
    }

    // Eliminar adjuntos purgables
    for (const { adjunto } of purgables.archivos) {
      // Borrar blob pero conservar miniatura
      if (adjunto.blob && adjunto.eliminarRemoto !== true) {
        await db.adjuntos.update(adjunto.id, {
          blob: null,
          tamanoBytes: 0,
        });
      } else {
        await db.adjuntos.delete(adjunto.id);
      }
      adjuntosPurgados.push(adjunto.id);
    }
  });

  return {
    serviciosPurgados,
    adjuntosPurgados,
    espacioLiberado,
    timestamp: new Date().toISOString(),
  };
}
