import { describe, expect, it } from 'vitest';

import { normalizarETag } from './etag';

describe('normalizarETag', () => {
  it.each([
    ['guid,3', '"guid,3"'],
    ['"guid,3"', '"guid,3"'],
    ['W/"guid,3"', 'W/"guid,3"'],
    ['  guid,3  ', '"guid,3"'],
    ['*', '*'],
    ['', ''],
  ])('«%s» → %s', (entrada, esperado) => {
    expect(normalizarETag(entrada)).toBe(esperado);
  });

  it('es idempotente', () => {
    expect(normalizarETag(normalizarETag('guid,3'))).toBe('"guid,3"');
  });
});
