import { describe, expect, it } from 'vitest';

import { TODOS_LOS_CAMPOS } from '@/domain/estados';
import { CAMPOS_SERVICIO, type CamposServicio, type TipoAdjunto } from '@/domain/servicio';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import {
  VALOR_COTIZACION_ESTADO,
  VALOR_ESTADO,
  VALOR_TIPO_ADJUNTO,
  VALOR_TIPO_EQUIPO,
} from './choices';
import { CAMPO_SP, aCamposSP, deCamposSP } from './servicioMapper';

/**
 * Nombres internos de SharePoint según `docs/03-Modelo-de-Datos.md` §2.2–§2.7 y §2.1.
 * Se crean exactamente así en las listas: un error de tipeo en el mapper rompería la sync.
 */
const COLUMNAS_DEL_MODELO: Readonly<Record<string, string>> = {
  tipoEquipo: 'TipoEquipo',
  estado: 'Estado',
  fechaRecepcion: 'FechaRecepcion',
  clienteId: 'ClienteLookupId',
  numeroSolicitud: 'NumeroSolicitud',
  marca: 'Marca',
  referencia: 'Referencia',
  serie: 'SerieEquipo',
  diagnostico: 'Diagnostico',
  observacionTecnica: 'ObservacionTecnica',
  fechaSocializacionDF: 'FechaSocializacionDF',
  cotizacionFechaEnvio: 'CotizacionFechaEnvio',
  cotizacionValor: 'CotizacionValor',
  cotizacionEstado: 'CotizacionEstado',
  otDetalle: 'OTDetalle',
  otCostoReparacion: 'OTCostoReparacion',
  fechaEntrega: 'FechaEntrega',
  proyeccionVidaUtil: 'ProyeccionVidaUtil',
  facturaNumero: 'FacturaNumero',
  facturaFecha: 'FacturaFecha',
  anulacionMotivo: 'MotivoAnulacion',
  anulacionFecha: 'FechaAnulacion',
};

/** Servicio con TODOS los campos de negocio llenos (ninguna rama queda sin probar). */
const servicioConTodoLleno = () => ({
  ...servicioBuilder()
    .facturado()
    .conCampos({
      clienteId: 7,
      clienteNombre: 'NAVAR ASOCIADOS',
      diagnostico: 'Reparable',
      observacionTecnica: 'Se revisa el equipo y se encuentra desgaste interno.',
      fechaSocializacionDF: '2026-10-05',
      cotizacionFechaEnvio: '2026-10-10',
      cotizacionValor: 150_000,
      cotizacionEstado: 'APROBADA',
      otDetalle: 'Cambio de celdas y prueba de carga.',
      otCostoReparacion: 90_000,
      fechaEntrega: '2026-10-15',
      proyeccionVidaUtil: '2027-10-15',
      facturaNumero: 'FE-2026-001234',
      facturaFecha: '2026-10-16',
      anulacionMotivo: 'Registro duplicado por error del técnico.',
      anulacionFecha: '2026-10-20',
    })
    .construir(),
});

describe('cobertura de los mappers con el modelo de datos (T012)', () => {
  it('cada campo del dominio tiene columna en SharePoint, salvo el nombre desnormalizado', () => {
    const sinColumna = CAMPOS_SERVICIO.filter(
      (campo) => campo !== 'clienteNombre' && CAMPO_SP[campo] === undefined
    );

    expect(sinColumna).toEqual([]);
    expect(CAMPO_SP.clienteNombre).toBeUndefined();
  });

  it('los nombres internos de columna coinciden exactamente con el modelo de datos', () => {
    expect(CAMPO_SP).toEqual(COLUMNAS_DEL_MODELO);
  });

  it('no hay dos campos que escriban la misma columna', () => {
    const columnas = Object.values(CAMPO_SP);

    expect(new Set(columnas).size).toBe(columnas.length);
  });

  it('el catálogo de campos de la máquina de estados está al día con el de los mappers', () => {
    const conMapper = Object.keys(CAMPO_SP) as (keyof CamposServicio)[];

    for (const campo of TODOS_LOS_CAMPOS) {
      if (campo === 'clienteNombre') continue;
      expect(conMapper, `falta el mapper de ${campo}`).toContain(campo);
    }
  });

  it('el registro completo viaja a SharePoint con todas las columnas de las etapas', () => {
    const remoto = aCamposSP(servicioConTodoLleno());

    for (const columna of Object.values(COLUMNAS_DEL_MODELO)) {
      expect(remoto, `falta ${columna}`).toHaveProperty(columna);
    }
  });

  it('ida y vuelta con todos los campos llenos no pierde ni altera ninguno', () => {
    const servicio = servicioConTodoLleno();

    const local = deCamposSP(aCamposSP(servicio));

    for (const campo of CAMPOS_SERVICIO) {
      if (campo === 'clienteNombre') continue;
      expect(servicio[campo], `el fixture no llena ${campo}`).toBeDefined();
      expect(local[campo], campo).toEqual(servicio[campo]);
    }
  });

  it('un PATCH de la etapa de diagnóstico envía solo sus columnas', () => {
    const remoto = aCamposSP(servicioConTodoLleno(), [
      'diagnostico',
      'observacionTecnica',
      'fechaSocializacionDF',
    ]);

    expect(Object.keys(remoto).sort()).toEqual(
      [
        'ActualizadoEnDispositivo',
        'AppVersion',
        'Diagnostico',
        'DispositivoId',
        'FechaSocializacionDF',
        'ObservacionTecnica',
      ].sort()
    );
  });

  it('las fechas viajan como medianoche UTC y vuelven como yyyy-MM-dd', () => {
    const remoto = aCamposSP(servicioConTodoLleno(), ['facturaFecha', 'proyeccionVidaUtil']);

    expect(remoto.FacturaFecha).toBe('2026-10-16T00:00:00Z');
    expect(remoto.ProyeccionVidaUtil).toBe('2027-10-15T00:00:00Z');
    expect(deCamposSP(remoto)).toMatchObject({
      facturaFecha: '2026-10-16',
      proyeccionVidaUtil: '2027-10-15',
    });
  });
});

describe('valores de Choice según el modelo de datos (§2.2, §2.4, §3.1, §4)', () => {
  it('estados', () => {
    expect(VALOR_ESTADO).toEqual({
      RECIBIDO: 'Recibido',
      DIAGNOSTICADO: 'Diagnosticado',
      COTIZADO: 'Cotizado',
      EN_REPARACION: 'En reparación',
      ENTREGADO: 'Entregado',
      FACTURADO: 'Facturado',
      DISPOSICION_FINAL: 'Disposición final',
      ANULADO: 'Anulado',
    });
    expect(VALOR_ESTADO).not.toHaveProperty('BORRADOR'); // el borrador nunca se sube
  });

  it('tipo de equipo y respuesta de la cotización', () => {
    expect(VALOR_TIPO_EQUIPO).toEqual({ BATERIA: 'Batería', CARGADOR: 'Cargador' });
    expect(VALOR_COTIZACION_ESTADO).toEqual({
      PENDIENTE: 'Pendiente',
      APROBADA: 'Aprobada',
      RECHAZADA: 'Rechazada',
    });
  });

  it('los seis tipos de adjunto', () => {
    const esperado: Record<TipoAdjunto, string> = {
      FOTO_INGRESO: 'Foto ingreso',
      FORMATO_DIAGNOSTICO: 'Formato diagnóstico',
      DISPOSICION_FINAL: 'Disposición final',
      COTIZACION: 'Cotización',
      FOTO_SALIDA: 'Foto salida',
      FACTURA: 'Factura',
    };

    expect(VALOR_TIPO_ADJUNTO).toEqual(esperado);
  });
});
