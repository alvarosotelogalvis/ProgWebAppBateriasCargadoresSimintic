import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportarRespaldoDialog } from './ExportarRespaldoDialog';
import * as respaldoModule from '@/application/respaldo/respaldo';

vi.mock('@/application/respaldo/respaldo');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'tecnico:respaldo.exportarTitulo': 'Exportar respaldo',
        'tecnico:respaldo.exportarDescripcion': 'Descarga una copia...',
        'tecnico:respaldo.alcance': '¿Qué deseas exportar?',
        'tecnico:respaldo.soloPendientes': 'Solo pendientes',
        'tecnico:respaldo.todos': 'Todos',
        'tecnico:respaldo.descargarRespaldo': 'Descargar',
        'tecnico:respaldo.exportando': 'Exportando...',
        'tecnico:respaldo.errorExportar': 'Error al exportar',
        'comun:comun.cancelar': 'Cancelar',
      };
      return map[`tecnico:${key}`] || map[`comun:${key}`] || key;
    },
  }),
}));

describe('ExportarRespaldoDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza con diálogo cerrado', () => {
    const { container } = render(
      <ExportarRespaldoDialog abierto={false} servicios={[]} onCerrar={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('exporta con alcance solo-pendientes por defecto', async () => {
    const blob = new Blob(['{}']);
    const mockExportar = vi.spyOn(respaldoModule, 'exportarRespaldo').mockResolvedValue({
      blob,
      tamanoEstimado: 1024,
      nombreArchivo: 'respaldo-solo-pendientes-2026-11-08.zip',
      serviciosIncluidos: 2,
    });

    const servicios = [
      { id: '1', syncState: 'pending' },
      { id: '2', syncState: 'synced' },
    ] as unknown as Servicio[];

    render(<ExportarRespaldoDialog abierto={true} servicios={servicios} onCerrar={vi.fn()} />);

    await waitFor(() => {
      const btn = screen.getByText('Descargar');
      fireEvent.click(btn);
    });

    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledWith(servicios, 'solo-pendientes');
    });
  });

  it('permite cambiar alcance a todos', async () => {
    const onCerrar = vi.fn();
    vi.spyOn(respaldoModule, 'exportarRespaldo').mockResolvedValue({
      blob: new Blob(),
      tamanoEstimado: 1024,
      nombreArchivo: 'test.zip',
      serviciosIncluidos: 5,
    });

    render(<ExportarRespaldoDialog abierto={true} servicios={[]} onCerrar={onCerrar} />);

    fireEvent.click(screen.getByDisplayValue('todos'));
    expect((screen.getByDisplayValue('todos') as HTMLInputElement).checked).toBe(true);
  });
});
