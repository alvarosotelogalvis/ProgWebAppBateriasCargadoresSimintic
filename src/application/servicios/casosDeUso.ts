import type { ServicioRepository } from '@/application/ports/servicioRepository'
import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository'
import type { UnidadDeTrabajo } from '@/application/ports/unidadDeTrabajo'
import type { IdGenerator } from '@/application/ports/idGenerator'
import type { Clock } from '@/application/ports/clock'
import type { AuthPort } from '@/application/ports/authPort'
import type { LoggerPort } from '@/application/ports/loggerPort'
import { v4 as uuidv4 } from 'uuid'

export type CrearBorradorInput = {
  equipo: any
  cliente: any
  solicitud: string
  dispositivoId?: string
}

export const crearCasosDeUso = (deps: {
  servicios: ServicioRepository
  adjuntos: AdjuntoRepository
  uow: UnidadDeTrabajo
  ids: IdGenerator
  clock: Clock
  auth: AuthPort
  logger: LoggerPort
  dispositivoId: string
}) => {
  const { servicios, adjuntos, uow, ids, clock, auth, dispositivoId } = deps

  return {
    crearBorrador: async (input: CrearBorradorInput) => {
      const cuenta = auth.obtenerCuenta() || 'desconocido'
      const ahora = clock.ahoraIso()
      const servicio = {
        ServicioId: ids.siguiente(),
        Folio: `OT-${Date.now()}`,
        Estado: 'BORRADOR',
        syncState: 'local',
        capturadoPor: cuenta,
        dispositivoId: input.dispositivoId || dispositivoId,
        fechaRecepcion: clock.fechaHoyIso(),
        cliente: input.cliente,
        equipo: input.equipo,
        solicitud: input.solicitud,
        camposSucios: [],
        creadoEn: ahora,
        actualizadoEn: ahora,
      } as any
      await servicios.guardar(servicio)
      return servicio
    },

    actualizarCampos: async (servicioId: string, campos: Record<string, any>) => {
      const servicio = await servicios.obtenerPorId(servicioId)
      if (!servicio) throw new Error('NO_ENCONTRADO')
      const nuevos = { ...servicio, ...campos, actualizadoEn: clock.ahoraIso() }
      if (servicio.Estado === 'BORRADOR') {
        nuevos.syncState = 'local'
      } else {
        nuevos.syncState = 'pending'
        nuevos.camposSucios = Array.from(new Set([...(servicio.camposSucios || []), ...Object.keys(campos)]))
      }
      await servicios.guardar(nuevos)
      return nuevos
    },

    completarEtapa: async (servicioId: string) => {
      return uow.ejecutar(async ({ servicios: sRepo, adjuntos: aRepo }) => {
        const servicio = await sRepo.obtenerPorId(servicioId)
        if (!servicio) throw new Error('NO_ENCONTRADO')
        if (servicio.Estado === 'BORRADOR') {
          servicio.Estado = 'RECIBIDO'
        }
        servicio.syncState = 'pending'
        servicio.actualizadoEn = clock.ahoraIso()
        await sRepo.guardar(servicio)
        await aRepo.marcarPendientes(servicioId)
        return servicio
      })
    },

    anular: async (servicioId: string, motivo: string) => {
      const servicio = await servicios.obtenerPorId(servicioId)
      if (!servicio) throw new Error('NO_ENCONTRADO')
      const actualizados = {
        ...servicio,
        Estado: 'ANULADO',
        motivoAnulacion: motivo,
        anulacion: { fecha: clock.ahoraIso(), usuario: auth.obtenerCuenta() || 'desconocido', motivo },
        actualizadoEn: clock.ahoraIso(),
        syncState: 'pending',
      }
      await servicios.guardar(actualizados as any)
      return actualizados
    },

    descartarBorrador: async (servicioId: string) => {
      return uow.ejecutar(async ({ servicios: sRepo, adjuntos: aRepo }) => {
        const servicio = await sRepo.obtenerPorId(servicioId)
        if (!servicio) throw new Error('NO_ENCONTRADO')
        if (servicio.Estado !== 'BORRADOR') {
          const { BorradorNoEliminableError } = await import('@/domain/errores')
          throw new BorradorNoEliminableError({ ServicioId: servicioId })
        }
        await aRepo.eliminarPorServicio(servicioId)
        await sRepo.eliminarBorrador(servicioId)
      })
    },
  }
}
