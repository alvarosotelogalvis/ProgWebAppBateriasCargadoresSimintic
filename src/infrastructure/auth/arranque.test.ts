import { describe, expect, it } from 'vitest';

import { urlTraeRespuestaDeLogin } from './arranque';

const url = (hash = '', search = '') => ({ hash, search });

describe('urlTraeRespuestaDeLogin', () => {
  it.each([
    ['#code=abc&state=xyz', ''],
    ['#error=access_denied&error_description=x', ''],
    ['#id_token=eyJ&state=1', ''],
    ['', '?code=abc&state=1'],
  ])('detecta la respuesta del redirect (%s %s)', (hash, search) => {
    expect(urlTraeRespuestaDeLogin(url(hash, search))).toBe(true);
  });

  it.each([
    ['', ''],
    ['#/servicios', ''],
    ['', '?tarjeta=pendientes'],
    ['', '?codigo=BAT-1'],
  ])('no se activa en un arranque normal (%s %s)', (hash, search) => {
    expect(urlTraeRespuestaDeLogin(url(hash, search))).toBe(false);
  });
});
