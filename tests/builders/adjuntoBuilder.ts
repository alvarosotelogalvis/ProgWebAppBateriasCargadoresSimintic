import type { Adjunto } from '@/domain/adjunto';
import type { TipoAdjunto } from '@/domain/servicio';

const SERVICIO_ID = '00000000-0000-4000-8000-000000000001';

const imagen = (contenido: string): Blob =>
  new Blob([new Uint8Array([...contenido].map((caracter) => caracter.charCodeAt(0)))], {
    type: 'image/jpeg',
  });

export const adjuntoBuilder = (inicial?: Partial<Adjunto>) => {
  let adjunto: Adjunto = {
    id: '00000000-0000-4000-8000-000000000101',
    servicioId: SERVICIO_ID,
    tipo: 'FOTO_INGRESO',
    nombreArchivo: 'foto.jpg',
    mime: 'image/jpeg',
    tamanoBytes: 3,
    sha256: 'a'.repeat(64),
    capturadoEn: '2026-10-21T08:00:00.000Z',
    capturadoPor: 'tecnico.demo@empresa.com',
    blob: imagen('abc'),
    miniatura: imagen('xy'),
    syncState: 'local',
    eliminarRemoto: false,
    ...inicial,
  };

  const api = {
    conCampos(campos: Partial<Adjunto>) {
      adjunto = { ...adjunto, ...campos };
      return api;
    },
    deTipo(tipo: TipoAdjunto) {
      adjunto = {
        ...adjunto,
        tipo,
        mime: tipo === 'FOTO_INGRESO' || tipo === 'FOTO_SALIDA' ? 'image/jpeg' : 'application/pdf',
        nombreArchivo: tipo === 'FOTO_INGRESO' || tipo === 'FOTO_SALIDA' ? 'foto.jpg' : 'doc.pdf',
      };
      return api;
    },
    enServicio(servicioId: string) {
      adjunto = { ...adjunto, servicioId };
      return api;
    },
    sincronizado(fecha = '2026-10-20T00:00:00.000Z') {
      adjunto = {
        ...adjunto,
        syncState: 'synced',
        sincronizadoEn: fecha,
        sp: {
          driveItemId: 'drive-1',
          webUrl: 'https://ejemplo.sharepoint.com/adjunto',
          eTag: 'etag-1',
        },
      };
      return api;
    },
    sinBlob() {
      adjunto = { ...adjunto, blob: null };
      return api;
    },
    construir(): Adjunto {
      return adjunto;
    },
  };

  return api;
};
