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

    const selectNivel = screen.getByLabelText('Nivel');
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

    const inputBusqueda = screen.getByLabelText('Evento');
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

    for (const nombre of ['Fecha', 'Nivel', 'Evento', 'Mensaje']) {
      expect(screen.getByRole('columnheader', { name: nombre })).toBeInTheDocument();
    }
    await waitFor(() => expect(screen.getByText('Sin cambios')).toBeInTheDocument());
  });

  it('muestra una fila por log con su nivel en mayúsculas y su evento', async () => {
    vi.spyOn(loggerModule, 'consultarLogs').mockResolvedValue([
      {
        seq: 1,
        ts: '2026-10-21T08:00:00.000Z',
        nivel: 'error',
        evento: 'sync.fallo',
        datos: { x: 1 },
      },
      { seq: 2, ts: '2026-10-21T08:01:00.000Z', nivel: 'info', evento: 'sync.ok' },
    ]);

    render(<VisorLogs />);

    expect(await screen.findByRole('cell', { name: 'ERROR' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'INFO' })).toBeInTheDocument();
    expect(screen.getByText('sync.fallo')).toBeInTheDocument();
    expect(screen.getByText('{"x":1}')).toBeInTheDocument();
  });
});
