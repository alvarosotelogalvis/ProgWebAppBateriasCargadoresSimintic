import type { Servicio, Adjunto } from './servicio';

export interface PurgableSelection {
  servicios: Servicio[];
  archivos: Array<{ servicioId: string; adjunto: Adjunto }>;
}

export function puedeEliminarse(servicio: Servicio): boolean {
  if (servicio.syncState !== 'synced') return false;
  const estadosCerrados = ['FACTURADO', 'ANULADO', 'DISPOSICION_FINAL'];
  return estadosCerrados.includes(servicio.estado);
}

export function seleccionarPurgables(
  servicios: Servicio[],
  adjuntosMap: Map<string, Adjunto[]>,
  diasOriginales: number = 7,
  mesesCerrados: number = 3
): PurgableSelection {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const serviciosPurgables: Servicio[] = [];
  const archivosPurgables: Array<{ servicioId: string; adjunto: Adjunto }> = [];

  for (const servicio of servicios) {
    // Servicios cerrados y sincronizados más antiguos que retención
    if (puedeEliminarse(servicio)) {
      const fechaSinc = new Date(servicio.ultimaSincronizacion || '');
      fechaSinc.setHours(0, 0, 0, 0);

      const diasTranscurridos = Math.floor(
        (hoy.getTime() - fechaSinc.getTime()) / (1000 * 60 * 60 * 24)
      );
      const mesesTranscurridos = Math.floor(diasTranscurridos / 30);

      if (mesesTranscurridos >= mesesCerrados) {
        serviciosPurgables.push(servicio);
      }
    }

    // Archivos originales de servicios sincronizados más antiguos que retención
    if (servicio.syncState === 'synced') {
      const adjuntos = adjuntosMap.get(servicio.id) || [];
      for (const adj of adjuntos) {
        if (!adj.blob) continue;

        const fechaSinc = new Date(adj.sincronizadoEn || '');
        fechaSinc.setHours(0, 0, 0, 0);

        const diasTranscurridos = Math.floor(
          (hoy.getTime() - fechaSinc.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diasTranscurridos >= diasOriginales) {
          archivosPurgables.push({ servicioId: servicio.id, adjunto: adj });
        }
      }
    }
  }

  return {
    servicios: serviciosPurgables,
    archivos: archivosPurgables,
  };
}

export function calcularEspacioLiberado(selection: PurgableSelection): number {
  let bytes = 0;

  // Servicios: suma de tamaños de archivos adjuntos
  // Aproximado: 5 MB por servicio con adjuntos (será más exacto con metadata real)
  bytes += selection.servicios.length * 5 * 1024 * 1024;

  // Archivos originales
  for (const { adjunto } of selection.archivos) {
    bytes += adjunto.tamaño || 0;
  }

  return bytes;
}
