import type { Adjunto } from '@/domain/servicio';
import { esFirmaPdf } from '@/domain/pdf';

export type TipoPdf = 'FORMATO_DIAGNOSTICO' | 'DISPOSICION_FINAL' | 'COTIZACION' | 'FACTURA';

export type AgregarPdfResultado =
  | { ok: true; adjunto: Adjunto; reemplazado?: string }
  | { ok: false; error: 'NO_ES_PDF' | 'TAMANO_EXCEDIDO' | 'ALMACENAMIENTO_LLENO' };

interface AdjuntosTable {
  where: (filter: Record<string, unknown>) => { first: () => Promise<Adjunto | undefined> };
  add: (a: Adjunto) => Promise<void>;
  delete: (id: string) => Promise<void>;
  put: (a: Adjunto) => Promise<void>;
  transaction: (mode: string, table: AdjuntosTable, cb: () => Promise<void>) => Promise<void>;
}

interface AppDatabase {
  adjuntos: AdjuntosTable;
}

/**
 * Valida y agrega un PDF a los adjuntos de un servicio.
 * Si ya existe un adjunto del mismo tipo, lo reemplaza:
 * - Si está local: se elimina directamente
 * - Si está sincronizado: se marca `eliminarRemoto` en la misma transacción
 */
export async function agregarPdf(
  servicioId: string,
  archivo: File,
  tipo: TipoPdf,
  db: AppDatabase,
  maxTamanoPdfMB: number = 20
): Promise<AgregarPdfResultado> {
  // 1. Validar que sea PDF (firma)
  const header = await archivo.slice(0, 1024).arrayBuffer();
  const bytes = new Uint8Array(header);
  if (!esFirmaPdf(bytes)) {
    return { ok: false, error: 'NO_ES_PDF' };
  }

  // 2. Validar tamaño
  const tamanoPdf = archivo.size / (1024 * 1024); // MB
  if (tamanoPdf > maxTamanoPdfMB) {
    return { ok: false, error: 'TAMANO_EXCEDIDO' };
  }

  // 3. Leer blob
  const blob = new Blob([await archivo.arrayBuffer()], { type: 'application/pdf' });

  // 4. Crear adjunto nuevo
  const adjuntoNuevo: Adjunto = {
    id: crypto.getRandomValues(new Uint8Array(16)).toString(),
    servicioId,
    tipo,
    blob,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    syncState: 'pending',
    sp: undefined,
    eliminarRemoto: false,
  };

  // 5. Reemplazar si existe
  let reemplazado: string | undefined;
  const adjuntoExistente = await db.adjuntos.where({ servicioId, tipo }).first();

  if (adjuntoExistente) {
    reemplazado = adjuntoExistente.id;

    // En transacción: eliminar local o marcar para eliminar remoto
    await db.adjuntos.transaction('rw', db.adjuntos, async () => {
      if (adjuntoExistente.sp) {
        adjuntoExistente.eliminarRemoto = true;
        await db.adjuntos.put(adjuntoExistente);
      } else {
        await db.adjuntos.delete(adjuntoExistente.id);
      }

      await db.adjuntos.add(adjuntoNuevo);
    });
  } else {
    await db.adjuntos.add(adjuntoNuevo);
  }

  return { ok: true, adjunto: adjuntoNuevo, reemplazado };
}
