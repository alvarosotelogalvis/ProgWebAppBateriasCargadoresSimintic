import type { Adjunto } from '@/domain/adjunto';
import { NoEncontradoError } from '@/domain/errores';
import { normalizarCodigoAlfanumerico } from '@/domain/normalizacion';
import { esFirmaPdf } from '@/domain/pdf';
import type { DepsAdjuntos } from './deps';

export type TipoPdf = 'FORMATO_DIAGNOSTICO' | 'DISPOSICION_FINAL' | 'COTIZACION' | 'FACTURA';

export type ErrorAgregarPdf = 'NO_ES_PDF' | 'TAMANO_EXCEDIDO' | 'ALMACENAMIENTO_LLENO';

export type AgregarPdfResultado =
  { ok: true; adjunto: Adjunto; reemplazado?: string } | { ok: false; error: ErrorAgregarPdf };

const BYTES_POR_MB = 1024 * 1024;
const BYTES_CABECERA = 1024;

/**
 * Valida y guarda un PDF del servicio (un único adjunto por tipo).
 * Si ya existe uno del mismo tipo lo reemplaza en la misma transacción:
 * - local → se elimina;
 * - ya sincronizado → se marca `eliminarRemoto` (nunca se pierde un dato sin subir).
 */
export const crearAgregarPdf =
  (deps: DepsAdjuntos) =>
  async (servicioId: string, archivo: Blob, tipo: TipoPdf): Promise<AgregarPdfResultado> => {
    const servicio = await deps.servicios.obtener(servicioId);
    if (!servicio) throw new NoEncontradoError(servicioId);

    const cabecera = new Uint8Array(
      await deps.contenido.leerBytes(archivo.slice(0, BYTES_CABECERA))
    );
    if (!esFirmaPdf(cabecera)) return { ok: false, error: 'NO_ES_PDF' };

    if (archivo.size > deps.config().maxTamanoPdfMB * BYTES_POR_MB) {
      return { ok: false, error: 'TAMANO_EXCEDIDO' };
    }

    const estimacion = await deps.storage.estimar();
    if (estimacion.porcentajeUsado >= 95) return { ok: false, error: 'ALMACENAMIENTO_LLENO' };

    const blob = new Blob([archivo], { type: 'application/pdf' });
    const id = deps.ids.siguiente();
    const cuenta = deps.auth.cuentaActiva();
    const nuevo: Adjunto = {
      id,
      servicioId,
      tipo,
      nombreArchivo: `${normalizarCodigoAlfanumerico(servicio.codigo || servicio.id)}_${tipo}_${id}.pdf`,
      mime: 'application/pdf',
      tamanoBytes: blob.size,
      sha256: await deps.contenido.sha256(blob),
      capturadoEn: deps.clock.ahoraIso(),
      capturadoPor: cuenta?.correo ?? 'local',
      blob,
      miniatura: null,
      syncState: servicio.estado === 'BORRADOR' ? 'local' : 'pending',
      eliminarRemoto: false,
    };

    const reemplazado = await deps.uow.ejecutar(async ({ adjuntos }) => {
      const anterior = (await adjuntos.listarPorServicio(servicioId)).find(
        (adjunto) => adjunto.tipo === tipo && !adjunto.eliminarRemoto
      );
      if (anterior) {
        if (anterior.sp || anterior.syncState === 'synced') {
          await adjuntos.guardar({
            ...anterior,
            blob: null,
            miniatura: null,
            eliminarRemoto: true,
            syncState: 'pending',
          });
        } else {
          await adjuntos.eliminarLocal(anterior.id);
        }
      }
      await adjuntos.guardar(nuevo);
      return anterior?.id;
    });

    deps.logger.info('adjunto.pdf.agregado', { servicioId, adjuntoId: id, tipo, bytes: blob.size });
    return reemplazado === undefined
      ? { ok: true, adjunto: nuevo }
      : { ok: true, adjunto: nuevo, reemplazado };
  };
