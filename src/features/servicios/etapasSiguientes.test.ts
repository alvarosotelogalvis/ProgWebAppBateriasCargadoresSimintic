import { describe, expect, it } from 'vitest';

import { etapasSiguientes, rolesPendientes } from './etapasSiguientes';

describe('etapasSiguientes', () => {
  it('RECIBIDO + Técnico: ofrece una única pantalla de diagnóstico (cubre DF)', () => {
    expect(etapasSiguientes('RECIBIDO', ['Tecnico'])).toEqual(['diagnostico']);
  });

  it('DIAGNOSTICADO: solo Comercial/Admin pueden cotizar', () => {
    expect(etapasSiguientes('DIAGNOSTICADO', ['Tecnico'])).toEqual([]);
    expect(etapasSiguientes('DIAGNOSTICADO', ['Comercial'])).toEqual(['cotizacion']);
    expect(etapasSiguientes('DIAGNOSTICADO', ['Administrador'])).toEqual(['cotizacion']);
  });

  it('COTIZADO + Técnico: orden de trabajo o entrega sin reparación', () => {
    expect(etapasSiguientes('COTIZADO', ['Tecnico'])).toEqual(['orden-trabajo', 'entrega']);
  });

  it('COTIZADO: el Comercial registra la respuesta del cliente; el Admin ve todo', () => {
    expect(etapasSiguientes('COTIZADO', ['Comercial'])).toEqual(['cotizacion']);
    expect(etapasSiguientes('COTIZADO', ['Administrador'])).toEqual([
      'orden-trabajo',
      'entrega',
      'cotizacion',
    ]);
  });

  it('EN_REPARACION + Técnico: entrega', () => {
    expect(etapasSiguientes('EN_REPARACION', ['Tecnico'])).toEqual(['entrega']);
  });

  it('ENTREGADO: facturación solo para Comercial/Admin', () => {
    expect(etapasSiguientes('ENTREGADO', ['Tecnico'])).toEqual([]);
    expect(etapasSiguientes('ENTREGADO', ['Comercial'])).toEqual(['facturacion']);
  });

  it('no ofrece nada en BORRADOR (se completa desde recepción), finales ni sin roles', () => {
    expect(etapasSiguientes('BORRADOR', ['Tecnico'])).toEqual([]);
    expect(etapasSiguientes('FACTURADO', ['Administrador'])).toEqual([]);
    expect(etapasSiguientes('DISPOSICION_FINAL', ['Administrador'])).toEqual([]);
    expect(etapasSiguientes('ANULADO', ['Administrador'])).toEqual([]);
    expect(etapasSiguientes('RECIBIDO', [])).toEqual([]);
  });

  it('nunca ofrece anular como etapa siguiente', () => {
    expect(etapasSiguientes('RECIBIDO', ['Administrador'])).not.toContain('anulacion');
  });
});

describe('rolesPendientes', () => {
  it('indica quién debe avanzar cuando el usuario no puede', () => {
    expect(rolesPendientes('DIAGNOSTICADO')).toEqual(['Comercial', 'Administrador']);
  });

  it('es vacío en estados finales', () => {
    expect(rolesPendientes('FACTURADO')).toEqual([]);
  });
});
