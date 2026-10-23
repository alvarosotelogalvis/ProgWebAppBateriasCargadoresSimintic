import type { CamposServicio, Servicio } from '@/domain/servicio';

const HOY = '2026-10-21';

export const crearServicioBase = (): Servicio => ({
  id: '00000000-0000-4000-8000-000000000001',
  codigo: 'CAR-1-NV4520',
  estado: 'RECIBIDO',
  tipoEquipo: 'CARGADOR',
  fechaRecepcion: '2026-10-01',
  clienteId: 1,
  clienteNombre: 'NAVAR ASOCIADOS',
  numeroSolicitud: 1,
  marca: 'ROQUET',
  referencia: 'REF-1',
  serie: 'NV4520',
  capturadoPor: 'tecnico.demo@empresa.com',
  capturadoPorNombre: 'Tecnico Demo',
  creadoEn: `${HOY}T08:00:00.000Z`,
  actualizadoEn: `${HOY}T08:00:00.000Z`,
  dispositivoId: 'disp-test-1',
  appVersion: '0.1.0',
  syncState: 'synced',
  camposSucios: [],
  base: {},
  conflictos: [],
  intentos: 0,
  origen: 'local',
});

export const servicioBuilder = (inicial: Servicio = crearServicioBase()) => {
  let servicio: Servicio = { ...inicial, base: { ...inicial.base } };

  const api = {
    conId(id: string) {
      servicio = { ...servicio, id };
      return api;
    },
    conCampos(campos: Partial<CamposServicio>) {
      servicio = { ...servicio, ...campos };
      return api;
    },
    borrador() {
      servicio = {
        ...servicio,
        estado: 'BORRADOR',
        tipoEquipo: 'BATERIA',
        numeroSolicitud: 0,
        marca: '',
        referencia: '',
        serie: '',
        clienteId: 0,
        clienteNombre: '',
        codigo: 'BAT-0-',
        syncState: 'local',
        camposSucios: [],
      };
      return api;
    },
    recibido() {
      servicio = { ...servicio, estado: 'RECIBIDO' };
      return api;
    },
    diagnosticado() {
      servicio = {
        ...servicio,
        estado: 'DIAGNOSTICADO',
        diagnostico: 'BATERIA DESGASTADA',
        observacionTecnica: 'Se revisa el equipo y se encuentra desgaste interno.',
      };
      return api;
    },
    cotizado() {
      servicio = {
        ...api.diagnosticado().construir(),
        estado: 'COTIZADO',
        cotizacionFechaEnvio: '2026-10-10',
        cotizacionEstado: 'PENDIENTE',
      };
      return api;
    },
    enReparacion() {
      servicio = {
        ...api.cotizado().construir(),
        estado: 'EN_REPARACION',
        cotizacionEstado: 'APROBADA',
        otDetalle: 'Cambio de celdas y prueba de carga.',
        otCostoReparacion: 150000,
      };
      return api;
    },
    entregado() {
      servicio = {
        ...api.enReparacion().construir(),
        estado: 'ENTREGADO',
        fechaEntrega: '2026-10-15',
        proyeccionVidaUtil: '2027-10-15',
      };
      return api;
    },
    facturado() {
      servicio = {
        ...api.entregado().construir(),
        estado: 'FACTURADO',
        facturaFecha: '2026-10-16',
        facturaNumero: 'FV-100',
      };
      return api;
    },
    conDisposicionFinal() {
      servicio = {
        ...servicio,
        estado: 'DISPOSICION_FINAL',
        diagnostico: 'D. FINAL',
        observacionTecnica: 'Equipo sin reparación viable; se dispone finalmente.',
        fechaSocializacionDF: '2026-10-12',
      };
      return api;
    },
    anulado() {
      servicio = {
        ...servicio,
        estado: 'ANULADO',
        anulacionMotivo: 'Registro duplicado por error del técnico.',
        anulacionFecha: HOY,
      };
      return api;
    },
    desconocido() {
      servicio = { ...servicio, estado: 'DESCONOCIDO' };
      return api;
    },
    sincronizado() {
      const base: Partial<CamposServicio> = {};
      for (const campo of Object.keys(servicio) as (keyof CamposServicio)[]) {
        if (campo in servicio && servicio[campo] !== undefined) {
          (base as Record<string, unknown>)[campo] = servicio[campo];
        }
      }
      servicio = {
        ...servicio,
        syncState: 'synced',
        camposSucios: [],
        base,
        conflictos: [],
      };
      return api;
    },
    pendiente() {
      servicio = { ...servicio, syncState: 'pending' };
      return api;
    },
    construir(): Servicio {
      return servicio;
    },
  };

  return api;
};
