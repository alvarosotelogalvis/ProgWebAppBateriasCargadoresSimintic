import { describe, expect, it } from 'vitest';

import {
  normalizarCamposRecepcion,
  normalizarCodigoAlfanumerico,
  normalizarMarca,
  normalizarReferencia,
  normalizarSerie,
} from './normalizacion';

describe('normalización', () => {
  it('normaliza la serie quitando espacios externos e internos y pasando a mayúsculas', () => {
    expect(normalizarSerie(' nv-4520 ')).toBe('NV-4520');
    expect(normalizarSerie('nv 4520')).toBe('NV4520');
  });

  it('normaliza marca conservando un espacio simple entre palabras', () => {
    expect(normalizarMarca('  roquet   industrial ')).toBe('ROQUET INDUSTRIAL');
  });

  it('normaliza la referencia', () => {
    expect(normalizarReferencia(' ref/1 ')).toBe('REF/1');
  });

  it('devuelve cadena vacía para entradas vacías', () => {
    expect(normalizarCodigoAlfanumerico('')).toBe('');
    expect(normalizarMarca('')).toBe('');
    expect(normalizarReferencia('')).toBe('');
    expect(normalizarSerie('')).toBe('');
  });

  it('normaliza los tres campos de recepción sin mutar el objeto original', () => {
    const original = { marca: 'roquet', referencia: ' r/1 ', serie: ' nv 1 ' };
    const resultado = normalizarCamposRecepcion(original);

    expect(resultado).toEqual({ marca: 'ROQUET', referencia: 'R/1', serie: 'NV1' });
    expect(original.marca).toBe('roquet');
  });
});
