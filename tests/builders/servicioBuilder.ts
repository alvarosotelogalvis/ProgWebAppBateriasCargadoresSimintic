import type { Servicio } from '@/domain/servicio'
import { FakeClock } from './FakeClock'
import { FakeIdGenerator } from './FakeIdGenerator'

const reloj = new FakeClock()
const ids = new FakeIdGenerator()

export const servicioBuilder = () => {
  let servicio: Partial<Servicio> = {
    ServicioId: ids.siguiente(),
    Folio: 'OT-2026-0001',
    Estado: 'BORRADOR',
    syncState: 'local',
    capturadoPor: 'tecnico@ejemplo.com',
    dispositivoId: 'disp-test-1',
    fechaRecepcion: reloj.fechaHoyIso(),
    cliente: { nombre: 'Cliente Prueba', identificacion: '123' },
    equipo: { tipo: 'BATERIA', marca: 'ACME', modelo: 'X1', serie: 'SN-0001' },
    solicitud: '',
    camposSucios: [],
    creadoEn: reloj.ahoraIso(),
    actualizadoEn: reloj.ahoraIso(),
  }

  return {
    recibido() {
      servicio = {
        ...servicio,
        Estado: 'RECIBIDO',
        fechaRecepcion: servicio.fechaRecepcion ?? reloj.fechaHoyIso(),
      }
      return this
    },
    conDiagnostico() {
      servicio = {
        ...servicio,
        diagnostico: {
          fecha: reloj.fechaHoyIso(),
          tecnico: 'tecnico@ejemplo.com',
          hallazgos: 'Se revisa estado general',
          causaFallo: 'Desgaste',
          solucionPropuesta: 'Recarga y prueba',
          repuestos: [],
        },
      }
      return this
    },
    construir(): Servicio {
      return servicio as Servicio
    },
  }
}
