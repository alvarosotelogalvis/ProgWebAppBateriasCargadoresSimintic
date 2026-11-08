import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LiberarEspacioDialog } from './LiberarEspacioDialog';
import * as purgasModule from '@/application/purgas/ejecutarPurgas';

vi.mock('@/application/purgas/ejecutarPurgas');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'tecnico:tecnico.liberar_espacio': 'Liberar espacio',
        'tecnico:respaldo.liberado': 'Espacio liberado',
        'tecnico:respaldo.limpiarAdvertencia': 'Se eliminarán datos...',
        'tecnico:respaldo.serviciosPurgados': 'Servicios purgados',
        'tecnico:respaldo.adjuntosPurgados': 'Adjuntos purgados',
        'tecnico:respaldo.purgando': 'Purgando...',
        'tecnico:respaldo.errorExportar': 'Error',
        'comun:comun.cerrar': 'Cerrar',
        'comun:comun.cancelar': 'Cancelar',
      };
      return map[`tecnico:${key}`] || map[`comun:${key}`] || key;
    },
  }),
}));

const mockDb = {} as unknown as Record<string, unknown>;

describe('LiberarEspacioDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza con diálogo cerrado', () => {
    const { container } = render(
      <LiberarEspacioDialog abierto={false} db={mockDb} onCerrar={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('libera espacio y muestra resultado', async () => {
    const onPurgado = vi.fn();
    vi.spyOn(purgasModule, 'ejecutarPurgas').mockResolvedValue({
      serviciosPurgados: ['1', '2'],
      adjuntosPurgados: ['a1'],
      espacioLiberado: 52428800,
      timestamp: new Date().toISOString(),
    });

    render(
      <LiberarEspacioDialog abierto={true} db={mockDb} onCerrar={vi.fn()} onPurgado={onPurgado} />
    );

    const btn = screen.getByText('Liberar espacio');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Espacio liberado.*50 MB/)).toBeInTheDocument();
    });

    expect(onPurgado).toHaveBeenCalledWith(52428800);
  });

  it('muestra recuento de servicios y adjuntos purgados', async () => {
    vi.spyOn(purgasModule, 'ejecutarPurgas').mockResolvedValue({
      serviciosPurgados: ['1', '2', '3'],
      adjuntosPurgados: ['a1', 'a2'],
      espacioLiberado: 10485760,
      timestamp: new Date().toISOString(),
    });

    render(<LiberarEspacioDialog abierto={true} db={mockDb} onCerrar={vi.fn()} />);

    fireEvent.click(screen.getByText('Liberar espacio'));

    await waitFor(() => {
      expect(screen.getByText('Servicios purgados: 3')).toBeInTheDocument();
      expect(screen.getByText('Adjuntos purgados: 2')).toBeInTheDocument();
    });
  });

  it('captura errores', async () => {
    vi.spyOn(purgasModule, 'ejecutarPurgas').mockRejectedValue(new Error('Purga fallida'));

    render(<LiberarEspacioDialog abierto={true} db={mockDb} onCerrar={vi.fn()} />);

    fireEvent.click(screen.getByText('Liberar espacio'));

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });
});
