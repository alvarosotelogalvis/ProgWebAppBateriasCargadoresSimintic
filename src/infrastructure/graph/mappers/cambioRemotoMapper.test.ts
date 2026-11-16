import { describe, expect, it } from 'vitest';

import { itemACambio } from './cambioRemotoMapper';

const completo = {
  ServicioId: '11111111-1111-4000-8000-111111111111',
  TipoEquipo: 'Batería',
  Estado: 'Facturado',
  Diagnostico: 'REPARABLE',
  FacturaNumero: 'FV-1',
};

describe('itemACambio · campos vaciados', () => {
  it('informa como vaciados los campos vaciables cuya columna no viene', () => {
    const cambio = itemACambio({ id: 5, fields: completo });

    expect(cambio.vaciados).toContain('observacionTecnica');
    expect(cambio.vaciados).toContain('facturaFecha');
    expect(cambio.vaciados).not.toContain('diagnostico');
    expect(cambio.vaciados).not.toContain('facturaNumero');
  });

  it('una columna en null también cuenta como vaciada', () => {
    const cambio = itemACambio({ id: 5, fields: { ...completo, FacturaNumero: null } });

    expect(cambio.vaciados).toContain('facturaNumero');
  });

  it('nunca marca como vaciados los campos obligatorios', () => {
    const cambio = itemACambio({ id: 5, fields: { ServicioId: completo.ServicioId } });

    for (const obligatorio of ['tipoEquipo', 'estado', 'serie', 'marca', 'clienteId'] as const) {
      expect(cambio.vaciados).not.toContain(obligatorio);
    }
  });

  it('no infiere nada de un ítem sin ServicioId ni de uno sin fields', () => {
    expect(itemACambio({ id: 5, fields: { Diagnostico: 'X' } }).vaciados).toEqual([]);
    expect(itemACambio({ id: 5 }).vaciados).toEqual([]);
  });

  it('un ítem eliminado no informa vaciados', () => {
    expect(itemACambio({ id: 5, '@removed': { reason: 'deleted' } }).vaciados).toBeUndefined();
  });
});
