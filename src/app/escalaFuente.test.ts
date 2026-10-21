import { describe, expect, it } from 'vitest';

import { aplicarEscalaFuente, VARIABLE_ESCALA } from '@/app/escalaFuente';

describe('aplicarEscalaFuente', () => {
  it('fija la escala 1.0 en el elemento raiz', () => {
    const root = document.createElement('html');
    aplicarEscalaFuente(1, root);
    expect(root.style.getPropertyValue(VARIABLE_ESCALA)).toBe('1');
  });

  it('fija la escala 1.15', () => {
    const root = document.createElement('html');
    aplicarEscalaFuente(1.15, root);
    expect(root.style.getPropertyValue(VARIABLE_ESCALA)).toBe('1.15');
  });

  it('fija la escala 1.3', () => {
    const root = document.createElement('html');
    aplicarEscalaFuente(1.3, root);
    expect(root.style.getPropertyValue(VARIABLE_ESCALA)).toBe('1.3');
  });

  it('usa documentElement cuando no se pasa raiz', () => {
    aplicarEscalaFuente(1.15);
    expect(document.documentElement.style.getPropertyValue(VARIABLE_ESCALA)).toBe('1.15');
  });
});
