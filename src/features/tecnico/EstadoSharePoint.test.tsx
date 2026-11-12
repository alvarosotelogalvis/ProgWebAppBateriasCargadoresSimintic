import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CLAVES_META } from '@/application/setup/claves';
import '@/shared/i18n';
import { EstadoSharePoint } from './EstadoSharePoint';

let meta: Record<string, unknown> = {};

vi.mock('@/shared/hooks/useDb', () => ({
  useDb: () => ({
    meta: {
      get: async (clave: string) => (clave in meta ? { clave, valor: meta[clave] } : undefined),
    },
  }),
}));

const CONFIGURADO = {
  [CLAVES_META.sitio]: 'ServicioTecnicoBC-DEV',
  [CLAVES_META.siteId]: 'site-123',
  [CLAVES_META.webUrl]: 'https://tenant.sharepoint.com/sites/baterias',
  [CLAVES_META.listIds]: { Servicios: 'lista-servicios-1', Clientes: 'lista-clientes-2' },
  [CLAVES_META.driveId]: 'biblioteca-adjuntos-9',
  [CLAVES_META.ultimaSyncEn]: '2026-10-21T08:00:00.000Z',
  [CLAVES_META.ultimoCorrelationId]: 'corr-abc',
};

beforeEach(() => {
  meta = {};
});

describe('EstadoSharePoint', () => {
  it('muestra la configuración del sitio guardada en la base local', async () => {
    meta = { ...CONFIGURADO };
    render(<EstadoSharePoint />);

    expect(await screen.findByText('ServicioTecnicoBC-DEV')).toBeInTheDocument();
  });

  it('muestra el id de la lista Servicios y el de la biblioteca de adjuntos', async () => {
    meta = { ...CONFIGURADO };
    render(<EstadoSharePoint />);

    expect(await screen.findByText('lista-servicios-1')).toBeInTheDocument();
    expect(screen.getByText('biblioteca-adjuntos-9')).toBeInTheDocument();
  });

  it('muestra el método de descarga y el último id de correlación', async () => {
    meta = { ...CONFIGURADO };
    render(<EstadoSharePoint />);

    expect(await screen.findByText('Microsoft Graph')).toBeInTheDocument();
    expect(screen.getByText('corr-abc')).toBeInTheDocument();
  });

  it('muestra la fecha de la última sincronización cuando existe', async () => {
    meta = { ...CONFIGURADO };
    render(<EstadoSharePoint />);

    const esperado = new Date('2026-10-21T08:00:00.000Z').toLocaleString('es-CO');
    const normalizar = (texto: string) => texto.replace(/\s/g, ' ');
    expect(
      await screen.findByText((contenido) => normalizar(contenido) === normalizar(esperado))
    ).toBeInTheDocument();
    expect(screen.queryByText('Nunca')).not.toBeInTheDocument();
  });

  it('muestra "Nunca" si todavía no hubo sincronización', async () => {
    meta = { ...CONFIGURADO, [CLAVES_META.ultimaSyncEn]: undefined };
    render(<EstadoSharePoint />);

    expect(await screen.findByText('Nunca')).toBeInTheDocument();
  });

  it('sin configuración muestra "No configurado" en los datos del sitio', async () => {
    render(<EstadoSharePoint />);

    await waitFor(() => expect(screen.getAllByText('No configurado')).toHaveLength(3));
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
