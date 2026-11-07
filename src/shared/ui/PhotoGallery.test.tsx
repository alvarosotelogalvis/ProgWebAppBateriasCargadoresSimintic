import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { PhotoGallery } from './PhotoGallery';

vi.mock('./Icon', () => ({ Icon: () => null }));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:miniatura');
  URL.revokeObjectURL = vi.fn();
});

describe('PhotoGallery', () => {
  it('muestra una ficha por adjunto', () => {
    render(
      <PhotoGallery
        adjuntos={[
          adjuntoBuilder().construir(),
          adjuntoBuilder().conCampos({ id: 'otro', nombreArchivo: 'foto2.jpg' }).construir(),
        ]}
      />
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ver foto.jpg' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver foto2.jpg' })).toBeInTheDocument();
  });

  it('notifica al ver y al eliminar', () => {
    const adjunto = adjuntoBuilder().construir();
    const onVer = vi.fn();
    const onEliminar = vi.fn();
    render(<PhotoGallery adjuntos={[adjunto]} onVer={onVer} onEliminar={onEliminar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver foto.jpg' }));
    expect(onVer).toHaveBeenCalledWith(adjunto);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar foto.jpg' }));
    expect(onEliminar).toHaveBeenCalledWith(adjunto);
  });

  it('usa imagen decorativa con texto alternativo vacio', () => {
    render(<PhotoGallery adjuntos={[adjuntoBuilder().construir()]} />);
    const imagen = screen.getByRole('presentation');
    expect(imagen).toHaveAttribute('alt', '');
  });
});
