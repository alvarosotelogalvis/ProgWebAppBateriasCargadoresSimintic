import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EstadoSharePoint } from './EstadoSharePoint';
import type { ConfigApp } from '@/domain/config';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'tecnico:estado_sharepoint': 'Estado de SharePoint',
        'tecnico:sitio_sharepoint': 'Sitio de SharePoint',
        'tecnico:id_lista_servicios': 'ID de lista Servicios',
        'tecnico:id_biblioteca_adjuntos': 'ID de biblioteca Adjuntos',
        'tecnico:ultima_sincronizacion': 'Última sincronización',
        'tecnico:metodo_descarga': 'Método de descarga',
        'tecnico:id_correlacion': 'ID de correlación',
        'comun:comun.cargando': 'Cargando...',
      };
      return map[`tecnico:${key}`] || map[`comun:${key}`] || key;
    },
  }),
}));

vi.mock('@/shared/hooks/useDb', () => ({
  useDb: () => ({
    logs: {
      orderBy: () => ({
        reverse: () => ({
          filter: () => ({
            limit: () => ({
              toArray: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    },
  }),
}));

describe('EstadoSharePoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra configuración del sitio', async () => {
    const config: ConfigApp = {
      SitioUrl: 'https://tenant.sharepoint.com/sites/baterias',
      IdListaServicios: 'list-123',
      IdBibliotecaAdjuntos: 'lib-456',
      TenantId: 'tenant-789',
      ClientId: 'client-000',
      DiagnosticoValorDisposicionFinal: 'Disposición Final',
    };

    render(<EstadoSharePoint config={config} />);

    await waitFor(() => {
      expect(screen.getByText('https://tenant.sharepoint.com/sites/baterias')).toBeInTheDocument();
      expect(screen.getByText('list-123')).toBeInTheDocument();
      expect(screen.getByText('lib-456')).toBeInTheDocument();
    });
  });

  it('muestra método de descarga como Microsoft Graph', async () => {
    const config = {
      SitioUrl: 'https://example.sharepoint.com',
    } as unknown as ConfigApp;

    render(<EstadoSharePoint config={config} />);

    await waitFor(() => {
      expect(screen.getByText('Microsoft Graph')).toBeInTheDocument();
    });
  });

  it('muestra "Nunca" si no hay sincronización', async () => {
    const config = {} as unknown as ConfigApp;

    render(<EstadoSharePoint config={config} />);

    await waitFor(() => {
      expect(screen.getByText('Nunca')).toBeInTheDocument();
    });
  });

  it('muestra valores por defecto si no están configurados', async () => {
    const config = {} as unknown as ConfigApp;

    render(<EstadoSharePoint config={config} />);

    await waitFor(() => {
      expect(screen.getByText('No configurado')).toBeInTheDocument();
    });
  });
});
