import { describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { resumenEtapas } from './resumenEtapas';

const respuesta = (estado: string) => `R:${estado}`;

describe('resumenEtapas', () => {
  it('recepción muestra la fecha; el resto queda vacío en un servicio recién recibido', () => {
    const resumen = resumenEtapas(servicioBuilder().recibido().construir(), respuesta);

    expect(resumen.recepcion).toBe('2026-10-01');
    expect(resumen.diagnostico).toBeUndefined();
    expect(resumen.orden).toBeUndefined();
    expect(resumen.entrega).toBeUndefined();
    expect(resumen.facturacion).toBeUndefined();
  });

  it('diagnóstico muestra el diagnóstico registrado', () => {
    const servicio = servicioBuilder()
      .diagnosticado()
      .conCampos({ diagnostico: 'Reparable' })
      .construir();

    expect(resumenEtapas(servicio, respuesta).diagnostico).toBe('Reparable');
  });

  it('orden de trabajo une la respuesta de la cotización, su valor y el costo de la OT', () => {
    const servicio = servicioBuilder()
      .enReparacion()
      .conCampos({
        cotizacionEstado: 'APROBADA',
        cotizacionValor: 1_500_000,
        otCostoReparacion: 350_000,
      })
      .construir();

    const texto = resumenEtapas(servicio, respuesta).orden ?? '';

    expect(texto).toContain('R:APROBADA');
    expect(texto.replace(/\s/g, ' ')).toContain('$ 1.500.000');
    expect(texto.replace(/\s/g, ' ')).toContain('$ 350.000');
  });

  it('cotizado sin respuesta registrada se resume como pendiente', () => {
    const servicio = servicioBuilder().cotizado().construir();
    delete servicio.cotizacionEstado;

    expect(resumenEtapas(servicio, respuesta).orden).toContain('R:PENDIENTE');
  });

  it('entrega muestra la fecha de entrega y la vida útil', () => {
    const servicio = servicioBuilder().entregado().construir();

    expect(resumenEtapas(servicio, respuesta).entrega).toBe('2026-10-15 · 2027-10-15');
  });

  it('facturación muestra el número y la fecha de la factura', () => {
    const servicio = servicioBuilder().facturado().conCampos({ facturaNumero: 'FE-1' }).construir();

    expect(resumenEtapas(servicio, respuesta).facturacion).toBe('FE-1 · 2026-10-16');
  });

  it('con valor de cotización cero no muestra el monto', () => {
    const servicio = servicioBuilder()
      .cotizado()
      .conCampos({ cotizacionEstado: 'PENDIENTE', cotizacionValor: 0 })
      .construir();

    expect(resumenEtapas(servicio, respuesta).orden).toBe('R:PENDIENTE');
  });
});
