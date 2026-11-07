import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Adjunto } from '@/domain/adjunto';
import { FormatoImagenError } from '@/domain/errores';
import '@/shared/i18n';
import { adjuntoBuilder } from '../../../../tests/builders/adjuntoBuilder';
import { AdjuntosEtapa } from './AdjuntosEtapa';

vi.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:adjunto');
  URL.revokeObjectURL = vi.fn();
});

function renderEtapa(overrides: {
  readonly adjuntos?: readonly Adjunto[];
  readonly onAgregar?: (archivo: File) => Promise<unknown>;
  readonly onEliminar?: (id: string) => Promise<unknown>;
}): {
  readonly onAgregar: ReturnType<typeof vi.fn>;
  readonly onEliminar: ReturnType<typeof vi.fn>;
} {
  const onAgregar = vi.fn(overrides.onAgregar ?? (() => Promise.resolve()));
  const onEliminar = vi.fn(overrides.onEliminar ?? (() => Promise.resolve()));
  render(
    <AdjuntosEtapa
      servicioId="00000000-0000-4000-8000-000000000001"
      adjuntos={overrides.adjuntos ?? []}
      minimo={1}
      maximo={5}
      onAgregar={onAgregar}
      onEliminar={onEliminar}
    />
  );
  return { onAgregar, onEliminar };
}

describe('AdjuntosEtapa', () => {
  it('oculta la webcam en punteros gruesos', () => {
    renderEtapa({});
    expect(screen.queryByRole('button', { name: /Camara del equipo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tomar foto/i })).toBeInTheDocument();
  });

  it('agrega las fotos elegidas desde la galeria', async () => {
    const { onAgregar } = renderEtapa({});
    const entrada = document.querySelector<HTMLInputElement>('input[multiple]');
    expect(entrada).not.toBeNull();
    const archivo = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });

    fireEvent.change(entrada!, { target: { files: [archivo] } });

    await waitFor(() => expect(onAgregar).toHaveBeenCalledWith(archivo));
  });

  it('muestra el error de formato cuando la imagen no es valida', async () => {
    const { onAgregar } = renderEtapa({
      onAgregar: () => Promise.reject(new FormatoImagenError('gif')),
    });
    const entrada = document.querySelector<HTMLInputElement>('input[multiple]');
    const archivo = new File(['x'], 'x.gif', { type: 'image/gif' });

    fireEvent.change(entrada!, { target: { files: [archivo] } });

    expect(await screen.findByText(/Formato no soportado/i)).toBeInTheDocument();
    expect(onAgregar).toHaveBeenCalledTimes(1);
  });

  it('abre el visor y permite navegar entre fotos', async () => {
    const primera = adjuntoBuilder().construir();
    const segunda = adjuntoBuilder()
      .conCampos({ id: 'otro', nombreArchivo: 'foto2.jpg' })
      .construir();
    renderEtapa({ adjuntos: [primera, segunda] });

    fireEvent.click(screen.getByRole('button', { name: 'Ver foto.jpg' }));
    expect(await screen.findByText('Ver foto ampliada')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Foto siguiente/i }));
    expect(await screen.findByAltText('foto2.jpg')).toBeInTheDocument();
  });

  it('confirma la eliminacion de una foto', async () => {
    const { onEliminar } = renderEtapa({ adjuntos: [adjuntoBuilder().construir()] });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar foto.jpg' }));
    expect(await screen.findByRole('heading', { name: 'Eliminar foto' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Eliminar foto$/i }));
    await waitFor(() =>
      expect(onEliminar).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000101')
    );
  });
});
