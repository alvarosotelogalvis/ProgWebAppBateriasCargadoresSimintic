import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportarRespaldoDialog } from './ImportarRespaldoDialog';
import * as respaldoModule from '@/application/respaldo/respaldo';

vi.mock('@/application/respaldo/respaldo');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'tecnico:respaldo.importarTitulo': 'Importar respaldo',
        'tecnico:respaldo.importarDescripcion': 'Carga un respaldo...',
        'tecnico:respaldo.seleccionarArchivo': 'Selecciona',
        'tecnico:respaldo.importar': 'Importar',
        'tecnico:respaldo.importando': 'Importando...',
        'tecnico:respaldo.noArchivoSeleccionado': 'Selecciona un archivo',
        'tecnico:respaldo.todosDuplicados': 'Todos duplicados',
        'tecnico:respaldo.errorImportar': 'Error al importar',
        'comun:comun.cancelar': 'Cancelar',
      };
      return map[`tecnico:${key}`] || map[`comun:${key}`] || key;
    },
  }),
}));

describe('ImportarRespaldoDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza con diálogo cerrado', () => {
    const { container } = render(
      <ImportarRespaldoDialog
        abierto={false}
        serviciosExistentes={[]}
        onImportados={vi.fn()}
        onCerrar={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('habilita botón importar solo con archivo', () => {
    render(
      <ImportarRespaldoDialog
        abierto={true}
        serviciosExistentes={[]}
        onImportados={vi.fn()}
        onCerrar={vi.fn()}
      />
    );

    const btn = screen.getByText('Importar');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('importa servicios del respaldo', async () => {
    const servicios = [
      { id: 'uuid-1', codigo: 'SVC-001', syncState: 'pending' } as unknown as Servicio,
    ];
    const onImportados = vi.fn();

    vi.spyOn(respaldoModule, 'importarRespaldo').mockResolvedValue({
      servicios,
      omitidos: [],
      resumen: { importados: 1, omitidos: 0 },
    });

    render(
      <ImportarRespaldoDialog
        abierto={true}
        serviciosExistentes={[]}
        onImportados={onImportados}
        onCerrar={vi.fn()}
      />
    );

    const file = new File(['{}'], 'respaldo.zip', { type: 'application/zip' });
    const input = screen.getByDisplayValue('');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Importar'));
    });

    await waitFor(() => {
      expect(onImportados).toHaveBeenCalledWith(servicios);
    });
  });

  it('muestra error si todos duplicados', async () => {
    vi.spyOn(respaldoModule, 'importarRespaldo').mockResolvedValue({
      servicios: [],
      omitidos: [{ id: 'uuid-1' } as unknown as Servicio],
      resumen: { importados: 0, omitidos: 1 },
    });

    render(
      <ImportarRespaldoDialog
        abierto={true}
        serviciosExistentes={[]}
        onImportados={vi.fn()}
        onCerrar={vi.fn()}
      />
    );

    const file = new File(['{}'], 'respaldo.zip');
    fireEvent.change(screen.getByDisplayValue(''), { target: { files: [file] } });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Importar'));
    });

    await waitFor(() => {
      expect(screen.getByText('Todos duplicados')).toBeInTheDocument();
    });
  });
});
