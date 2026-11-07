import { describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../tests/builders/servicioBuilder';
import { camposEditables } from './estados';
import type { EstadoServicio, Rol } from './servicio';

const servicio = (estado: EstadoServicio) => servicioBuilder().conCampos({ estado }).construir();

const contiene = (estado: EstadoServicio, roles: Rol[], campo: string) =>
  camposEditables(servicio(estado), roles).has(campo as never);

describe('camposEditables', () => {
  it('permite al técnico editar la recepción en borrador', () => {
    expect(contiene('BORRADOR', ['Tecnico'], 'serie')).toBe(true);
    expect(contiene('BORRADOR', ['Tecnico'], 'diagnostico')).toBe(false);
  });

  it('no permite editar la recepción al comercial', () => {
    expect(camposEditables(servicio('BORRADOR'), ['Comercial']).size).toBe(0);
  });

  it('limita al técnico a los campos de la etapa actual', () => {
    expect(contiene('RECIBIDO', ['Tecnico'], 'diagnostico')).toBe(true);
    expect(contiene('RECIBIDO', ['Tecnico'], 'observacionTecnica')).toBe(true);
    expect(contiene('RECIBIDO', ['Tecnico'], 'serie')).toBe(false);
    expect(contiene('DIAGNOSTICADO', ['Tecnico'], 'cotizacionFechaEnvio')).toBe(false);
  });

  it('da al administrador los campos pasados y actuales', () => {
    expect(contiene('RECIBIDO', ['Administrador'], 'serie')).toBe(true);
    expect(contiene('RECIBIDO', ['Administrador'], 'diagnostico')).toBe(true);
    expect(contiene('ENTREGADO', ['Administrador'], 'otDetalle')).toBe(true);
    expect(contiene('ENTREGADO', ['Administrador'], 'facturaFecha')).toBe(true);
  });

  it('permite al comercial cotizar y facturar', () => {
    expect(contiene('DIAGNOSTICADO', ['Comercial'], 'cotizacionFechaEnvio')).toBe(true);
    expect(contiene('DIAGNOSTICADO', ['Comercial'], 'diagnostico')).toBe(false);
    expect(contiene('ENTREGADO', ['Comercial'], 'facturaFecha')).toBe(true);
    expect(contiene('ENTREGADO', ['Comercial'], 'facturaNumero')).toBe(true);
    expect(contiene('ENTREGADO', ['Comercial'], 'fechaEntrega')).toBe(false);
  });

  it('permite al técnico la OT y la entrega cuando corresponden', () => {
    expect(contiene('COTIZADO', ['Tecnico'], 'otDetalle')).toBe(true);
    expect(contiene('COTIZADO', ['Tecnico'], 'fechaEntrega')).toBe(true);
    expect(contiene('EN_REPARACION', ['Tecnico'], 'fechaEntrega')).toBe(true);
    expect(contiene('EN_REPARACION', ['Tecnico'], 'otDetalle')).toBe(false);
  });

  it('cierra los campos en estados finales salvo para el administrador', () => {
    expect(camposEditables(servicio('FACTURADO'), ['Tecnico']).size).toBe(0);
    expect(contiene('FACTURADO', ['Administrador'], 'facturaFecha')).toBe(true);
    expect(contiene('FACTURADO', ['Administrador'], 'anulacionMotivo')).toBe(false);
    expect(contiene('ANULADO', ['Administrador'], 'anulacionMotivo')).toBe(true);
    expect(camposEditables(servicio('ANULADO'), ['Tecnico']).size).toBe(0);
  });

  it('nunca expone el estado como campo editable', () => {
    const todos = camposEditables(servicio('ENTREGADO'), ['Administrador']);
    expect(todos.has('estado' as never)).toBe(false);
  });

  it('no permite editar un estado desconocido ni sin roles', () => {
    expect(camposEditables(servicio('DESCONOCIDO'), ['Administrador']).size).toBe(0);
    expect(camposEditables(servicio('RECIBIDO'), []).size).toBe(0);
  });
});
