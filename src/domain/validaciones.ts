import { z } from 'zod';

import { normalizarMarca, normalizarReferencia, normalizarSerie } from './normalizacion';
import type { TipoEquipo } from './servicio';

const SERIE_REGEX = /^[A-Z0-9][A-Z0-9\-/.]{0,49}$/;
const REFERENCIA_REGEX = /^[A-Z0-9][A-Z0-9\-/.]{0,49}$/;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const FACTURA_REGEX = /^[A-Za-z0-9-]{1,30}$/;

export const fechaLocalHoy = (referencia: Date = new Date()): string => {
  const anio = referencia.getFullYear();
  const mes = String(referencia.getMonth() + 1).padStart(2, '0');
  const dia = String(referencia.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const texto = (claveRequerida: string) => z.string({ error: claveRequerida });

const textoConEspaciosProhibidos = (
  requerida: string,
  formato: string,
  espacios: string,
  regex: RegExp,
  max: number
) =>
  texto(requerida)
    .max(max + 10, { message: formato })
    .refine((valor) => valor.trim().length > 0, { message: requerida })
    .refine((valor) => !/\s/.test(valor.trim()), { message: espacios })
    .transform((valor) => valor.trim().toUpperCase())
    .pipe(z.string().regex(regex, { message: formato }));

const fechaISO = (requerida: string, formato: string) =>
  texto(requerida).min(1, { message: requerida }).regex(FECHA_REGEX, { message: formato });

const numeroEntero = (requerida: string, min: number, max: number) =>
  z
    .number({ error: formatoNumero(requerida) })
    .int({ message: formatoNumero(requerida) })
    .min(min, { message: formatoNumero(requerida) })
    .max(max, { message: formatoNumero(requerida) });

const formatoNumero = (clave: string): string => clave;

const noPasada = (valor: string, hoy: string): boolean => valor <= hoy;
const desdeRecepcion = (valor: string, recepcion: string): boolean => valor >= recepcion;

/** Recepción: datos mínimos de §2.2. */
export const esquemaRecepcion = (hoy: string = fechaLocalHoy()) =>
  z
    .object({
      tipoEquipo: z.enum(['BATERIA', 'CARGADOR'], {
        error: 'errores.servicio.tipoEquipoRequerido',
      }),
      fechaRecepcion: fechaISO(
        'errores.servicio.fechaRecepcionRequerida',
        'errores.servicio.fechaFormato'
      ).refine((valor) => noPasada(valor, hoy), { message: 'errores.servicio.fechaFutura' }),
      clienteId: numeroEntero('errores.servicio.clienteRequerido', 1, Number.MAX_SAFE_INTEGER),
      clienteNombre: texto('errores.servicio.clienteRequerido').trim().min(1, {
        message: 'errores.servicio.clienteRequerido',
      }),
      numeroSolicitud: numeroEntero('errores.servicio.solicitudRequerida', 1, 999999999),
      marca: texto('errores.servicio.marcaRequerida')
        .transform(normalizarMarca)
        .pipe(
          z
            .string()
            .min(1, { message: 'errores.servicio.marcaRequerida' })
            .max(60, { message: 'errores.servicio.marcaFormato' })
        ),
      referencia: textoConEspaciosProhibidos(
        'errores.servicio.referenciaRequerida',
        'errores.servicio.referenciaFormato',
        'errores.servicio.referenciaEspacios',
        REFERENCIA_REGEX,
        50
      ),
      serie: textoConEspaciosProhibidos(
        'errores.servicio.serieRequerida',
        'errores.servicio.serieFormato',
        'errores.servicio.serieEspacios',
        SERIE_REGEX,
        50
      ),
    })
    .transform((datos) => ({
      ...datos,
      serie: normalizarSerie(datos.serie),
      referencia: normalizarReferencia(datos.referencia),
    }));

/** Diagnóstico (sin disposición final). */
export const esquemaDiagnostico = () =>
  z.object({
    diagnostico: texto('errores.servicio.diagnosticoRequerido').trim().min(1, {
      message: 'errores.servicio.diagnosticoRequerido',
    }),
    observacionTecnica: texto('errores.servicio.observacionRequerida')
      .trim()
      .min(5, { message: 'errores.servicio.observacionFormato' })
      .max(4000, { message: 'errores.servicio.observacionFormato' }),
  });

/** Diagnóstico + socialización para pasar a disposición final. */
export const esquemaDisposicionFinal = (hoy: string, fechaRecepcion: string) =>
  esquemaDiagnostico().extend({
    fechaSocializacionDF: fechaISO(
      'errores.servicio.fechaSocializacionRequerida',
      'errores.servicio.fechaFormato'
    )
      .refine((valor) => desdeRecepcion(valor, fechaRecepcion), {
        message: 'errores.servicio.fechaSocializacionInvalida',
      })
      .refine((valor) => noPasada(valor, hoy), {
        message: 'errores.servicio.fechaFutura',
      }),
  });

/** Cotización. */
export const esquemaCotizacion = (hoy: string, fechaRecepcion: string) =>
  z.object({
    cotizacionFechaEnvio: fechaISO(
      'errores.servicio.cotizacionFechaRequerida',
      'errores.servicio.fechaFormato'
    )
      .refine((valor) => desdeRecepcion(valor, fechaRecepcion), {
        message: 'errores.servicio.entregaAntesRecepcion',
      })
      .refine((valor) => noPasada(valor, hoy), { message: 'errores.servicio.fechaFutura' }),
    cotizacionValor: z
      .number({ error: 'errores.servicio.cotizacionValorInvalido' })
      .min(0, { message: 'errores.servicio.cotizacionValorInvalido' })
      .optional(),
    cotizacionEstado: z
      .enum(['PENDIENTE', 'APROBADA', 'RECHAZADA'], {
        error: 'errores.servicio.cotizacionEstadoInvalido',
      })
      .optional(),
  });

/** Orden de trabajo interna. */
export const esquemaOrdenTrabajo = () =>
  z.object({
    otDetalle: texto('errores.servicio.otDetalleRequerido')
      .trim()
      .min(5, { message: 'errores.servicio.otDetalleFormato' })
      .max(4000, { message: 'errores.servicio.otDetalleFormato' }),
    otCostoReparacion: z
      .number({ error: 'errores.servicio.otCostoInvalido' })
      .min(0, { message: 'errores.servicio.otCostoInvalido' }),
  });

/** Entrega. `requiereVidaUtil` es false en la entrega sin reparación. */
export const esquemaEntrega = (hoy: string, fechaRecepcion: string, requiereVidaUtil: boolean) => {
  const base = z.object({
    fechaEntrega: fechaISO(
      'errores.servicio.fechaEntregaRequerida',
      'errores.servicio.fechaFormato'
    )
      .refine((valor) => desdeRecepcion(valor, fechaRecepcion), {
        message: 'errores.servicio.entregaAntesRecepcion',
      })
      .refine((valor) => noPasada(valor, hoy), { message: 'errores.servicio.fechaFutura' }),
    proyeccionVidaUtil: fechaISO(
      'errores.servicio.vidaUtilRequerida',
      'errores.servicio.fechaFormato'
    ).optional(),
  });

  return base.superRefine((datos, ctx) => {
    if (requiereVidaUtil && !datos.proyeccionVidaUtil) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proyeccionVidaUtil'],
        message: 'errores.servicio.vidaUtilRequerida',
      });
      return;
    }
    if (datos.proyeccionVidaUtil && datos.proyeccionVidaUtil <= datos.fechaEntrega) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proyeccionVidaUtil'],
        message: 'errores.servicio.vidaUtilInvalida',
      });
    }
  });
};

/** Facturación. */
export const esquemaFacturacion = (hoy: string, fechaRecepcion: string) =>
  z.object({
    facturaFecha: fechaISO(
      'errores.servicio.facturaFechaRequerida',
      'errores.servicio.fechaFormato'
    )
      .refine((valor) => desdeRecepcion(valor, fechaRecepcion), {
        message: 'errores.servicio.entregaAntesRecepcion',
      })
      .refine((valor) => noPasada(valor, hoy), { message: 'errores.servicio.fechaFutura' }),
    facturaNumero: z.preprocess(
      (valor) => (valor === '' || valor === null ? undefined : valor),
      z
        .string()
        .regex(FACTURA_REGEX, { message: 'errores.servicio.facturaNumeroFormato' })
        .optional()
    ),
  });

/** Anulación. */
export const esquemaAnulacion = () =>
  z.object({
    anulacionMotivo: texto('errores.servicio.motivoMinimo')
      .trim()
      .min(10, { message: 'errores.servicio.motivoMinimo' }),
  });

export type DatosRecepcion = z.infer<ReturnType<typeof esquemaRecepcion>>;

export const tiposEquipo: readonly TipoEquipo[] = ['BATERIA', 'CARGADOR'];
