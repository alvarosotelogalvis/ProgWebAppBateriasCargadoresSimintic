import { crearManifiesto } from '@/domain/respaldo';
import { empaquetar, estimarTamano, type ArchivoEnZip } from '@/infrastructure/respaldo/zip';
import type { Servicio } from '@/domain/servicio';

export type AlcanceRespaldo = 'solo-pendientes' | 'todos';

export interface ResultadoExportar {
  blob: Blob;
  tamanoEstimado: number;
  nombreArchivo: string;
  serviciosIncluidos: number;
}

export interface ResultadoImportar {
  servicios: Servicio[];
  omitidos: Servicio[];
  resumen: {
    importados: number;
    omitidos: number;
  };
}

export async function exportarRespaldo(
  servicios: Servicio[],
  alcance: AlcanceRespaldo,
  appVersion: string = '0.1.0',
  dispositivoId: string = 'dispositivo-local'
): Promise<ResultadoExportar> {
  // Filtrar servicios segÃºn alcance
  const aExportar =
    alcance === 'solo-pendientes' ? servicios.filter((s) => s.syncState === 'pending') : servicios;

  // Crear manifiesto
  const manifiesto = crearManifiesto(appVersion, dispositivoId, aExportar.length, 0);

  // Preparar archivos para empaquetar
  const archivos: ArchivoEnZip[] = [
    {
      ruta: 'manifiesto.json',
      contenido: JSON.stringify(manifiesto, null, 2),
      tipo: 'application/json',
    },
    {
      ruta: 'servicios.json',
      contenido: JSON.stringify(
        aExportar.map((s) => ({
          id: s.id,
          codigo: s.codigo,
          clienteNombre: s.clienteNombre,
          estado: s.estado,
          syncState: 'pending', // Siempre pendientes al importar
        })),
        null,
        2
      ),
      tipo: 'application/json',
    },
  ];

  // Crear blob
  const blob = await empaquetar(archivos);
  const tamanoEstimado = estimarTamano(archivos);

  const ahora = new Date().toISOString().slice(0, 10);
  const nombreArchivo = `respaldo-${alcance}-${ahora}.zip`;

  return {
    blob,
    tamanoEstimado,
    nombreArchivo,
    serviciosIncluidos: aExportar.length,
  };
}

export async function importarRespaldo(
  blob: Blob,
  serviciosExistentes: Servicio[] = []
): Promise<ResultadoImportar> {
  const archivos = await desempaquetar(blob);

  const manifestoArchivo = archivos.find((a) => a.ruta === 'manifiesto.json');
  const serviciosArchivo = archivos.find((a) => a.ruta === 'servicios.json');

  if (!manifestoArchivo || !serviciosArchivo) {
    throw new Error('Formato de respaldo no vÃ¡lido');
  }

  const serviciosImportados = JSON.parse(
    typeof serviciosArchivo.contenido === 'string'
      ? serviciosArchivo.contenido
      : await new Blob([serviciosArchivo.contenido]).text()
  );

  const idsExistentes = new Set(serviciosExistentes.map((s) => s.id));
  const servicios: Servicio[] = [];
  const omitidos: Servicio[] = [];

  for (const svc of serviciosImportados) {
    if (idsExistentes.has(svc.id)) {
      omitidos.push(svc);
    } else {
      servicios.push({ ...svc, syncState: 'pending' });
    }
  }

  return {
    servicios,
    omitidos,
    resumen: {
      importados: servicios.length,
      omitidos: omitidos.length,
    },
  };
}

// Utilidades
async function desempaquetar(blob: Blob) {
  const { desempaquetar: unzip } = await import('@/infrastructure/respaldo/zip');
  return unzip(blob);
}
