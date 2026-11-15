import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { MenuTecnicoPage } from './MenuTecnicoPage';

vi.mock('./EstadoDispositivo', () => ({
  EstadoDispositivo: () => <div data-testid="estado-dispositivo" />,
}));
vi.mock('./EstadoSharePoint', () => ({
  EstadoSharePoint: () => <div data-testid="estado-sharepoint" />,
}));
vi.mock('./VisorLogs', () => ({ VisorLogs: () => <div data-testid="visor-logs" /> }));
vi.mock('./ExportarRespaldoDialog', () => ({
  ExportarRespaldoDialog: ({ abierto }: { abierto: boolean }) =>
    abierto ? <div data-testid="dialogo-exportar" /> : null,
}));
vi.mock('./ImportarRespaldoDialog', () => ({
  ImportarRespaldoDialog: ({ abierto }: { abierto: boolean }) =>
    abierto ? <div data-testid="dialogo-importar" /> : null,
}));
vi.mock('./LiberarEspacioDialog', () => ({
  LiberarEspacioDialog: ({ abierto }: { abierto: boolean }) =>
    abierto ? <div data-testid="dialogo-liberar" /> : null,
}));
vi.mock('./RestablecerAppDialog', () => ({
  RestablecerAppDialog: ({ abierto }: { abierto: boolean }) =>
    abierto ? <div data-testid="dialogo-restablecer" /> : null,
}));
vi.mock('@/shared/hooks/useDb', () => ({ useDb: () => ({}) }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MenuTecnicoPage', () => {
  it('muestra primero el estado del dispositivo', () => {
    render(<MenuTecnicoPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Menú técnico' })).toBeInTheDocument();
    expect(screen.getByTestId('estado-dispositivo')).toBeInTheDocument();
    expect(screen.queryByTestId('estado-sharepoint')).not.toBeInTheDocument();
  });

  it('cambia de pestaña (SharePoint y registros)', () => {
    render(<MenuTecnicoPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Estado de SharePoint' }));
    expect(screen.getByTestId('estado-sharepoint')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Registros de eventos' }));
    expect(screen.getByTestId('visor-logs')).toBeInTheDocument();
  });

  it.each([
    ['Exportar respaldo', 'dialogo-exportar'],
    ['Importar respaldo', 'dialogo-importar'],
    ['Liberar espacio', 'dialogo-liberar'],
  ])('«%s» abre su diálogo', (boton, dialogo) => {
    render(<MenuTecnicoPage />);

    fireEvent.click(screen.getByRole('button', { name: boton }));

    expect(screen.getByTestId(dialogo)).toBeInTheDocument();
  });

  it('ofrece restablecer solo cuando se le da la acción', () => {
    const { unmount } = render(<MenuTecnicoPage />);
    expect(screen.queryByRole('button', { name: 'Restablecer la app' })).not.toBeInTheDocument();
    unmount();

    render(<MenuTecnicoPage onRestablecerApp={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer la app' }));
    expect(screen.getByTestId('dialogo-restablecer')).toBeInTheDocument();
  });
});
