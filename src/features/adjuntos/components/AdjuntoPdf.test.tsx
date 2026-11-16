import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';
import { adjuntoBuilder } from '../../../../tests/builders/adjuntoBuilder';
import AdjuntoPdf from './AdjuntoPdf';

const pdf = () =>
  adjuntoBuilder({
    tipo: 'FACTURA',
    mime: 'application/pdf',
    blob: new Blob(['pdf'], { type: 'application/pdf' }),
  }).construir();

describe('AdjuntoPdf (HU-007-7)', () => {
  it('muestra el tipo del documento y sus acciones con textos traducidos', () => {
    render(<AdjuntoPdf adjunto={pdf()} onReplace={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('FACTURA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver PDF' })).toBeInTheDocument();
    expect(screen.getByText('Reemplazar PDF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar PDF' })).toBeInTheDocument();
  });

  it('en solo lectura no ofrece ver, reemplazar ni eliminar', () => {
    render(<AdjuntoPdf adjunto={pdf()} onReplace={() => {}} onDelete={() => {}} readOnly />);

    expect(screen.queryByText('Reemplazar PDF')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar PDF' })).not.toBeInTheDocument();
  });

  it('pide confirmación antes de eliminar y solo elimina al confirmar', () => {
    const onDelete = vi.fn();
    const adjunto = pdf();
    render(<AdjuntoPdf adjunto={adjunto} onReplace={() => {}} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar PDF' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('¿Eliminar este PDF?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(onDelete).toHaveBeenCalledWith(adjunto.id);
  });

  it('al cancelar la confirmación no elimina', () => {
    const onDelete = vi.fn();
    render(<AdjuntoPdf adjunto={pdf()} onReplace={() => {}} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar PDF' }));
    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Eliminar este PDF?')).not.toBeInTheDocument();
  });

  it('entrega el archivo elegido al reemplazar', () => {
    const onReplace = vi.fn();
    const { container } = render(
      <AdjuntoPdf adjunto={pdf()} onReplace={onReplace} onDelete={() => {}} />
    );
    const archivo = new File(['%PDF-1.4'], 'nuevo.pdf', { type: 'application/pdf' });

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [archivo] },
    });

    expect(onReplace).toHaveBeenCalledWith(archivo);
  });
});
