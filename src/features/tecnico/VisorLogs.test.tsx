import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisorLogs } from './VisorLogs';
import * as loggerModule from '@/infrastructure/logging/logger';

vi.mock('@/infrastructure/logging/logger');
vi.mock('@/shared/hooks/useDb', () => ({
  useDb: () => ({}),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'tecnico:registros': 'Registros de eventos',
        'tecnico:nivel_log': 'Nivel',
        'tecnico:evento': 'Evento',
        'tecnico:mensaje': 'Mensaje',
        'tecnico:fecha': 'Fecha',
        'tecnico:filtrar': 'Filtrar',
        'tecnico:sin_cambios': 'Sin cambios',
        'comun:comun.cargando': 'Cargando...',
      };
      return map[`tecnico:${key}`] || map[`comun:${key}`] || key;
    },
  }),
}));

describe('VisorLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza tabla de logs vacía inicialmente', async () => {
    vi.spyOn(loggerModule, 'consultarLogs').mockResolvedValue([]);

    render(<VisorLogs />);

    await waitFor(() => {
      expect(screen.getByText('Sin cambios')).toBeInTheDocument();
    });
  });

  it('filtra por nivel', async () => {
    const mockConsultarLogs = vi.spyOn(loggerModule, 'consultarLogs').mockResolvedValue([]);

    render(<VisorLogs />);

    const selectNivel = screen.getByDisplayValue('');
    fireEvent.change(selectNivel, { target: { value: 'error' } });

    await waitFor(() => {
      expect(mockConsultarLogs).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nivel: 'error',
        })
      );
    });
  });

  it('busca por evento', async () => {
    const mockConsultarLogs = vi.spyOn(loggerModule, 'consultarLogs').mockResolvedValue([]);

    render(<VisorLogs />);

    const inputBusqueda = screen.getByPlaceholderText('Filtrar');
    fireEvent.change(inputBusqueda, { target: { value: 'sync' } });

    await waitFor(() => {
      expect(mockConsultarLogs).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          busqueda: 'sync',
        })
      );
    });
  });

  it('muestra tabla con headers', async () => {
    vi.spyOn(loggerModule, 'consultarLogs').mockResolvedValue([]);

    render(<VisorLogs />);

    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Nivel')).toBeInTheDocument();
    expect(screen.getByText('Evento')).toBeInTheDocument();
    expect(screen.getByText('Mensaje')).toBeInTheDocument();

    render(<VisorLogs />);

    await waitFor(() => {
      const errorCell = screen.getByText('ERROR');
      expect(errorCell).toHaveStyle('color: var(--color-peligro)');
    });
  });
});
