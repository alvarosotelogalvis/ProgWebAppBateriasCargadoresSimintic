import { describe, expect, it } from 'vitest';

import { MAX_ERRORES_LOG, resumirErroresLog } from './bitacora';

const error = (i: number, largo = 50) => ({
  servicioId: `s-${i}`,
  codigo: 'SP_SERVIDOR',
  mensaje: 'x'.repeat(largo),
});

describe('resumirErroresLog (Modelo §6.4)', () => {
  it('serializa la lista completa cuando cabe', () => {
    const errores = [error(1), error(2)];
    expect(JSON.parse(resumirErroresLog(errores))).toEqual(errores);
    expect(resumirErroresLog([])).toBe('[]');
  });

  it('recorta sin romper el JSON e indica cuántos se omitieron', () => {
    const errores = Array.from({ length: 100 }, (_, i) => error(i, 200));
    const texto = resumirErroresLog(errores);

    expect(texto.length).toBeLessThanOrEqual(MAX_ERRORES_LOG);
    const lista = JSON.parse(texto) as Array<Record<string, unknown>>;
    const ultimo = lista.at(-1);
    expect(ultimo).toEqual({ omitidos: 100 - (lista.length - 1) });
    expect(lista[0]).toEqual(errores[0]);
  });

  it('respeta el límite aun con un único error enorme', () => {
    const texto = resumirErroresLog([error(1, 10_000)]);
    expect(texto.length).toBeLessThanOrEqual(MAX_ERRORES_LOG);
    expect(JSON.parse(texto)).toEqual([{ omitidos: 1 }]);
  });
});
