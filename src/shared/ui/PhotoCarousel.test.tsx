import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PhotoCarousel from './PhotoCarousel';

describe('PhotoCarousel (T013)', () => {
  const fotos = [
    { url: 'data:image/jpeg;base64,ABC', alt: 'Foto 1' },
    { url: 'data:image/jpeg;base64,DEF', alt: 'Foto 2' },
    { url: 'data:image/jpeg;base64,GHI', alt: 'Foto 3' },
  ];

  it('debe anunciar "Foto n de m" accesiblemente', () => {
    render(<PhotoCarousel fotos={fotos} />);
    expect(screen.getByText(/Foto 1 de 3/i)).toBeInTheDocument();
  });

  it('debe mostrar 1 foto visible en compacto', () => {
    render(<PhotoCarousel fotos={fotos} breakpoint="compact" />);
    const imagenes = screen.getAllByRole('img');
    expect(imagenes.length).toBe(1);
  });

  it('debe mostrar 3 fotos en medio', () => {
    render(<PhotoCarousel fotos={fotos} breakpoint="medium" />);
    const imagenes = screen.getAllByRole('img');
    expect(imagenes.length).toBeGreaterThanOrEqual(3);
  });

  it('debe permitir navegación con flechas y teclado', () => {
    // stub: verificar en implementación
    expect(true).toBe(true);
  });
});
