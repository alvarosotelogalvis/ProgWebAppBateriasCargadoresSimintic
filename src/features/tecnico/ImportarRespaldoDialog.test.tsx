import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import * as respaldo from '@/application/respaldo/respaldo';
import type { AppDB } from '@/infrastructure/db/dexie';

import { ImportarRespaldoDialog } from './ImportarRespaldoDialog';

vi.mock('@/application/respaldo/respaldo', () => ({ importarRespaldo: vi.fn() }));
vi.mock('./respaldoDeps', () => ({
  depsRespaldo: () => ({ exportar: {}, importar: { marca: 'deps-importar' } }),
}));

const montar = (props: Partial<Parameters<typeof ImportarRespaldoDialog>[0]> = {}) =>
  render(<ImportarRespaldoDialog abierto db={{} as AppDB} onCerrar={vi.fn()} {...props} />);

const elegirArchivo = (nombre = 'respaldo.zip'): File => {
  const archivo = new File(['zip'], nombre, { type: 'application/zip' });
  fireEvent.change(screen.getByTestId('archivo-respaldo'), { target: { files: [archivo] } });
  return archivo;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ImportarRespaldoDialog', () => {
  it('el botón Importar queda deshabilitado hasta elegir un archivo', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled();

    elegirArchivo();

    expect(screen.getByRole('button', { name: 'Importar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'respaldo.zip' })).toBeInTheDocument();
  });

  it('importa y muestra cuántos servicios se restauraron y cuántos se omitieron', async () => {
    vi.mocked(respaldo.importarRespaldo).mockResolvedValue({
      importados: 3,
      omitidos: 1,
      adjuntosImportados: 4,
    });
    const onImportados = vi.fn();
    montar({ onImportados });
    const archivo = elegirArchivo();

    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));

    expect(await screen.findByText(/3 servicios restaurados, 1 omitidos/)).toBeInTheDocument();
    expect(respaldo.importarRespaldo).toHaveBeenCalledWith({ marca: 'deps-importar' }, archivo);
    expect(onImportados).toHaveBeenCalledWith({
      importados: 3,
      omitidos: 1,
      adjuntosImportados: 4,
    });
  });

  it('avisa si todos los servicios del respaldo ya existían', async () => {
    vi.mocked(respaldo.importarRespaldo).mockResolvedValue({
      importados: 0,
      omitidos: 2,
      adjuntosImportados: 0,
    });
    montar();
    elegirArchivo();

    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ya existen en este dispositivo');
  });

  it('un respaldo inválido muestra el error sin cerrar', async () => {
    vi.mocked(respaldo.importarRespaldo).mockRejectedValue(new Error('no es un zip'));
    const onCerrar = vi.fn();
    montar({ onCerrar });
    elegirArchivo('malo.zip');

    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Error al importar el respaldo');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Importar' })).toBeEnabled());
    expect(onCerrar).not.toHaveBeenCalled();
  });
});
