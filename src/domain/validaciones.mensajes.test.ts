import { describe, expect, it } from 'vitest';

import {
  esquemaAnulacion,
  esquemaCotizacion,
  esquemaDiagnostico,
  esquemaDisposicionFinal,
  esquemaEntrega,
  esquemaFacturacion,
  esquemaOrdenTrabajo,
  esquemaRecepcion,
} from './validaciones';

/**
 * Los mensajes de validación son claves de traducción (`errores.*`). Un campo AUSENTE
 * (undefined) también debe producir una clave, nunca el texto por defecto de la librería.
 */
const HOY = '2026-10-21';
const RECEPCION = '2026-10-01';

const esquemas: ReadonlyArray<readonly [string, { safeParse: (valor: unknown) => unknown }]> = [
  ['recepción', esquemaRecepcion(HOY)],
  ['diagnóstico', esquemaDiagnostico()],
  ['disposición final', esquemaDisposicionFinal(HOY, RECEPCION)],
  ['cotización', esquemaCotizacion(HOY, RECEPCION)],
  ['orden de trabajo', esquemaOrdenTrabajo()],
  ['entrega', esquemaEntrega(HOY, RECEPCION, true)],
  ['facturación', esquemaFacturacion(HOY, RECEPCION)],
  ['anulación', esquemaAnulacion()],
];

const mensajes = (resultado: unknown): string[] => {
  const r = resultado as { success: boolean; error?: { issues: { message: string }[] } };
  return r.success ? [] : (r.error?.issues ?? []).map((issue) => issue.message);
};

describe('mensajes de validación como claves de traducción', () => {
  it.each(esquemas)('%s: un objeto vacío solo produce claves errores.*', (_nombre, esquema) => {
    const lista = mensajes(esquema.safeParse({}));

    expect(lista.length).toBeGreaterThan(0);
    for (const mensaje of lista) expect(mensaje).toMatch(/^errores\./);
  });

  it.each(esquemas)(
    '%s: valores de tipo incorrecto también producen claves',
    (_nombre, esquema) => {
      const equivocado = {
        tipoEquipo: 5,
        fechaRecepcion: 5,
        clienteId: 'x',
        clienteNombre: 5,
        numeroSolicitud: 'x',
        marca: 5,
        referencia: 5,
        serie: 5,
        diagnostico: 5,
        observacionTecnica: 5,
        fechaSocializacionDF: 5,
        cotizacionFechaEnvio: 5,
        cotizacionValor: 'x',
        cotizacionEstado: 5,
        otDetalle: 5,
        otCostoReparacion: 'x',
        fechaEntrega: 5,
        proyeccionVidaUtil: 5,
        facturaFecha: 5,
        anulacionMotivo: 5,
      };

      for (const mensaje of mensajes(esquema.safeParse(equivocado))) {
        expect(mensaje).toMatch(/^errores\./);
      }
    }
  );

  it('la observación técnica ausente apunta a su clave específica', () => {
    expect(mensajes(esquemaDiagnostico().safeParse({ diagnostico: 'Reparable' }))).toEqual([
      'errores.servicio.observacionRequerida',
    ]);
  });

  it('el costo de la OT ausente o no numérico apunta a su clave específica', () => {
    const base = { otDetalle: 'Cambio de celdas' };

    expect(mensajes(esquemaOrdenTrabajo().safeParse(base))).toEqual([
      'errores.servicio.otCostoInvalido',
    ]);
    expect(mensajes(esquemaOrdenTrabajo().safeParse({ ...base, otCostoReparacion: 'x' }))).toEqual([
      'errores.servicio.otCostoInvalido',
    ]);
  });
});
