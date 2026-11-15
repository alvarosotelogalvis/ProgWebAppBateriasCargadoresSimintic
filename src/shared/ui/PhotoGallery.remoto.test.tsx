import { render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { PhotoGallery } from './PhotoGallery';

vi.mock('./Icon', () => ({ Icon: () => null }));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:miniatura');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const remoto = () =>
  adjuntoBuilder()
    .conCampos({
      id: 'r1',
      nombreArchivo: 'CAR-1_FOTO_INGRESO_aaaaaaaa.jpg',
      blob: null,
      miniatura: null,
      syncState: 'synced',
      sp: { driveItemId: 'd1', webUrl: 'https://empresa.sharepoint.com/x', eTag: '"e"' },
    })
    .construir();

describe('PhotoGallery · adjuntos remotos (ES-006-14, ES-006-15)', () => {
  it('marca el adjunto como «En SharePoint» y ofrece abrir el original con conexión', () => {
    render(<PhotoGallery adjuntos={[remoto()]} />);

    expect(screen.getByText('En SharePoint')).toBeInTheDocument();
    const enlace = screen.getByRole('link', { name: 'Abrir en SharePoint' });
    expect(enlace).toHaveAttribute('href', 'https://empresa.sharepoint.com/x');
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('sin conexión no hay enlace: se explica que requiere conexión', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<PhotoGallery adjuntos={[remoto()]} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Abrir en SharePoint (requiere conexión)')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('un adjunto remoto no se puede eliminar desde el dispositivo', () => {
    render(<PhotoGallery adjuntos={[remoto()]} onEliminar={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
  });

  it('un adjunto propio no muestra nada de SharePoint', () => {
    render(<PhotoGallery adjuntos={[adjuntoBuilder().construir()]} />);
    expect(screen.queryByText('En SharePoint')).not.toBeInTheDocument();
  });
});
