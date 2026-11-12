import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EstadoDispositivo } from './EstadoDispositivo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'tecnico:estado_dispositivo': 'Estado del dispositivo',
        'tecnico:plataforma': 'Plataforma',
        'tecnico:navegador': 'Navegador',
        'tecnico:almacenamiento_persistente': 'Almacenamiento persistente',
        'tecnico:version_base_local': 'Versión de la base local',
        'tecnico:uso_espacio': 'Uso de espacio',
        'tecnico:identificador_dispositivo': 'Identificador del dispositivo',
        'comun:comun.cargando': 'Cargando...',
      };
      return map[`tecnico:${key}`] || map[`comun:${key}`] || key;
    },
  }),
}));

describe('EstadoDispositivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'platform', { value: 'Linux x86_64', writable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      writable: true,
    });
  });

  it('renderiza información del dispositivo', async () => {
    render(<EstadoDispositivo />);

    await waitFor(() => {
      expect(screen.getByText('Linux x86_64')).toBeInTheDocument();
      expect(screen.getByText('Chrome')).toBeInTheDocument();
    });
  });

  it('muestra barra de uso de almacenamiento', async () => {
    // Mock storage estimate
    const mockStorage = {
      estimate: vi.fn().mockResolvedValue({
        usage: 500 * 1024 * 1024,
        quota: 1000 * 1024 * 1024,
      }),
    };
    Object.defineProperty(navigator, 'storage', {
      value: mockStorage,
      writable: true,
    });

    render(<EstadoDispositivo />);

    await waitFor(() => {
      expect(screen.getByText(/500 MB \/ 1000 MB/)).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  it('genera ID del dispositivo consistente', async () => {
    render(<EstadoDispositivo />);

    await waitFor(() => {
      expect(screen.getByText(/Linux x86_64-Chrome/)).toBeInTheDocument();
    });
  });

  it('muestra estado de almacenamiento persistente', async () => {
    const mockStorage = {
      persisted: vi.fn().mockResolvedValue(true),
      estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 1000 * 1024 * 1024 }),
    };
    Object.defineProperty(navigator, 'storage', {
      value: mockStorage,
      writable: true,
    });

    render(<EstadoDispositivo />);

    await waitFor(() => {
      expect(screen.getByText(/✓ Habilitado/)).toBeInTheDocument();
    });
  });

  it('muestra version_base_local', async () => {
    render(<EstadoDispositivo />);

    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });
  });
});
