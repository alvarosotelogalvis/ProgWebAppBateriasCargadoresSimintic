import type { Adjunto } from '@/domain/adjunto'
import { FakeIdGenerator } from '../fakes/FakeIdGenerator'
import { FakeClock } from '../fakes/FakeClock'

const ids = new FakeIdGenerator()
const reloj = new FakeClock()

export const adjuntoBuilder = () => {
  let adjunto: Partial<Adjunto> = {
    AdjuntoId: ids.siguiente(),
    ServicioId: '00000000-0000-4000-8000-000000000001',
    tipo: 'FOTO',
    etapa: 'RECEPCION',
    nombreArchivo: 'foto.jpg',
    mimeType: 'image/jpeg',
    tamanoBytes: 1024,
    hashSha256: 'ab'.repeat(32),
    blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
    miniaturaBlob: new Blob([new Uint8Array([4, 5, 6])], { type: 'image/jpeg' }),
    syncState: 'local',
    subidoPor: 'tecnico@ejemplo.com',
    subidoEn: reloj.ahoraIso(),
    camposSucios: [],
  }

  return {
    enServicio(servicioId: string) {
      adjunto.ServicioId = servicioId
      return this
    },
    construir(): Adjunto {
      return adjunto as Adjunto
    },
  }
}
