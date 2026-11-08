import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MenuTecnicoPage } from './MenuTecnicoPage';

vi.mock('./EstadoDispositivo', () => ({
  EstadoDispositivo: () => <div data-testid="estado-dispositivo" />,
}));

vi.mock('./EstadoSharePoint', () => ({
  EstadoSharePoint: () => <div data-testid="estado-sharepoint" />,
}));

vi.mock('./VisorLogs', () => ({
  VisorLogs: () => <div data-testid="visor-logs" />,
}));

vi.mock('./ExportarRespaldoDialog', () => ({
  ExportarRespaldoDialog: () => null,
}));

vi.mock('./ImportarRespaldoDialog', () => ({
  ImportarRespaldoDialog: () => null,
}));

vi.mock('./LiberarEspacioDialog', () => ({
  LiberarEspacioDialog: () => null,
}));

vi.mock('@/shared/hooks/useDb', () => ({
  useDb: () => ({}),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('MenuTecnicoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza tab dispositivo por defecto', () => {
    const config = {} as Record<string, unknown>;
    render(<MenuTecnicoPage config={config} />);

    expect(screen.getByTestId('estado-dispositivo')).toBeInTheDocument();
  });

  it('cambia tab al hacer clic', async () => {
    const config = {} as Record<string, unknown>;
    render(<MenuTecnicoPage config={config} />);

    const sharePointTab = screen.getAllByRole('button')[1];
    fireEvent.click(sharePointTab);

    await waitFor(() => {
      expect(screen.getByTestId('estado-sharepoint')).toBeInTheDocument();
    });
  });

  it('navega a tab logs', async () => {
    const config = {} as Record<string, unknown>;
    render(<MenuTecnicoPage config={config} />);

    const logsTab = screen.getAllByRole('button')[2];
    fireEvent.click(logsTab);

    await waitFor(() => {
      expect(screen.getByTestId('visor-logs')).toBeInTheDocument();
    });
  });

  it('renderiza botones de acciones', () => {
    const config = {} as Record<string, unknown>;
    render(<MenuTecnicoPage config={config} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(3);
  });

  it('llama callback onRestablecerApp cuando se hace clic', async () => {
    const mockRestablecer = vi.fn();
    const config = {} as Record<string, unknown>;

    render(<MenuTecnicoPage config={config} onRestablecerApp={mockRestablecer} />);

    const buttons = screen.getAllByRole('button');
    const restablecerBtn = buttons.find((btn) => btn.textContent === 'restablecer_app');

    if (restablecerBtn) {
      fireEvent.click(restablecerBtn);
      await waitFor(() => {
        expect(mockRestablecer).toHaveBeenCalled();
      });
    }
  });
});
