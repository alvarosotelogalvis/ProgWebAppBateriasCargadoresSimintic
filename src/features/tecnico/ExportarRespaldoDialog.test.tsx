import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import * as respaldo from '@/application/respaldo/respaldo';
import type { AppDB } from '@/infrastructure/db/dexie';
import * as compartir from '@/infrastructure/respaldo/compartir';

import { ExportarRespaldoDialog } from './ExportarRespaldoDialog';

vi.mock('@/application/respaldo/respaldo', () => ({ exportarRespaldo: vi.fn() }));
vi.mock('@/infrastructure/respaldo/compartir', () => ({ compartirRespaldo: vi.fn() }));
vi.mock('./respaldoDeps', () => ({
  depsRespaldo: () => ({ exportar: { marca: 'deps-exportar' }, importar: {} }),
}));

const resultado = {
  blob: new Blob(['zip']),
  tamanoEstimado: 3,
  nombreArchivo: 'respaldo-solo-pendientes-2026-11-15.zip',
  serviciosIncluidos: 2,
  adjuntosIncluidos: 1,
};

const montar = (onCerrar = vi.fn()) =>
  render(<ExportarRespaldoDialog abierto db={{} as AppDB} onCerrar={onCerrar} />);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(respaldo.exportarRespaldo).mockResolvedValue(resultado);
  vi.mocked(compartir.compartirRespaldo).mockResolvedValue('descargado');
});

describe('ExportarRespaldoDialog', () => {
  it('no se muestra cerrado', () => {
    const { container } = render(
      <ExportarRespaldoDialog abierto={false} db={{} as AppDB} onCerrar={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('exporta lo pendiente por defecto, comparte el ZIP y cierra', async () => {
    const onCerrar = vi.fn();
    montar(onCerrar);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar respaldo' }));

    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    expect(respaldo.exportarRespaldo).toHaveBeenCalledWith(
      { marca: 'deps-exportar' },
      'solo-pendientes'
    );
    expect(compartir.compartirRespaldo).toHaveBeenCalledWith(
      resultado.blob,
      resultado.nombreArchivo
    );
  });

  it('permite exportar todos los servicios', async () => {
    montar();

    fireEvent.click(screen.getByRole('radio', { name: 'Todos los servicios' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar respaldo' }));

    await waitFor(() =>
      expect(respaldo.exportarRespaldo).toHaveBeenCalledWith(expect.anything(), 'todos')
    );
  });

  it('si el usuario cancela el cuadro de compartir, el diálogo sigue abierto', async () => {
    vi.mocked(compartir.compartirRespaldo).mockResolvedValue('cancelado');
    const onCerrar = vi.fn();
    montar(onCerrar);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar respaldo' }));

    await waitFor(() => expect(compartir.compartirRespaldo).toHaveBeenCalled());
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('si falla la exportación muestra el error y permite reintentar', async () => {
    vi.mocked(respaldo.exportarRespaldo).mockRejectedValue(new Error('boom'));
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar respaldo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Error al exportar el respaldo');
    expect(screen.getByRole('button', { name: 'Descargar respaldo' })).toBeEnabled();
  });
});
