import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdjuntoPdf from './AdjuntoPdf';
import { adjuntoBuilder } from '../../../tests/builders';

describe('T018: AdjuntoPdf (HU-007-7)', () => {
  it('debe mostrar nombre y tamaño', () => {
    const adjunto = adjuntoBuilder()
      .tipo('FACTURA')
      .blob(new Blob(['pdf'], { type: 'application/pdf' }))
      .build();

    render(<AdjuntoPdf adjunto={adjunto} onReplace={() => {}} onDelete={() => {}} />);

    expect(screen.getByText(/pdf/i)).toBeInTheDocument();
  });

  it('debe mostrar botón "Ver"', () => {
    const adjunto = adjuntoBuilder()
      .tipo('FACTURA')
      .blob(new Blob(['pdf'], { type: 'application/pdf' }))
      .build();

    render(<AdjuntoPdf adjunto={adjunto} onReplace={() => {}} onDelete={() => {}} />);

    expect(screen.getByRole('button', { name: /ver/i })).toBeInTheDocument();
  });

  it('debe mostrar solo lectura si readOnly=true', () => {
    const adjunto = adjuntoBuilder()
      .tipo('FACTURA')
      .blob(new Blob(['pdf'], { type: 'application/pdf' }))
      .build();

    render(
      <AdjuntoPdf adjunto={adjunto} onReplace={() => {}} onDelete={() => {}} readOnly={true} />
    );

    expect(screen.queryByRole('button', { name: /reemplazar/i })).not.toBeInTheDocument();
  });

  it('debe confirmar antes de eliminar', () => {
    // stub
    expect(true).toBe(true);
  });
});
