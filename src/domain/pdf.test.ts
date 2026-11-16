import { describe, it, expect } from 'vitest';
import { esFirmaPdf } from './pdf';

describe('T008: esFirmaPdf', () => {
  it('debe reconocer PDF válido con firma %PDF-', () => {
    const pdfBytes = new TextEncoder().encode('%PDF-1.4\n...');
    expect(esFirmaPdf(pdfBytes)).toBe(true);
  });

  it('debe reconocer PDF con basura antes de %PDF-', () => {
    const basura = new Uint8Array(100);
    const pdf = new TextEncoder().encode('%PDF-1.4\n...');
    const combined = new Uint8Array([...basura, ...pdf]);
    expect(esFirmaPdf(combined)).toBe(true);
  });

  it('debe rechazar archivo sin %PDF-', () => {
    const notPdf = new TextEncoder().encode('Este es un texto plano');
    expect(esFirmaPdf(notPdf)).toBe(false);
  });
});
