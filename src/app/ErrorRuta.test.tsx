import { render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { ErrorRuta } from './ErrorRuta';

vi.mock('@/shared/ui/Icon', () => ({ Icon: () => <svg aria-hidden="true" /> }));

const INICIO = 'inicio';
const PANTALLA_INICIO = 'pantalla de inicio';

const pintar = (ruta: string, rutas: Parameters<typeof createMemoryRouter>[0]) =>
  render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: [ruta] })} />);

function Rota(): React.JSX.Element {
  throw new Error('fallo de prueba');
}

describe('ErrorRuta (T058)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('una pantalla que falla muestra el aviso en español, sin la traza, con salida al inicio', () => {
    pintar('/rota', [
      { path: '/', element: <p>{INICIO}</p> },
      { path: '/rota', element: <Rota />, errorElement: <ErrorRuta /> },
    ]);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument();
    expect(screen.queryByText(/fallo de prueba/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('un 404 se explica como «página no encontrada» y no ofrece reintentar', async () => {
    pintar('/no-existe', [
      { path: '/', element: <p>{INICIO}</p> },
      {
        errorElement: <ErrorRuta />,
        children: [
          {
            path: '*',
            loader: () => {
              throw new Response('Not Found', { status: 404 });
            },
          },
        ],
      },
    ]);

    expect(
      await screen.findByRole('heading', { name: 'Página no encontrada' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('«Ir al inicio» navega a la raíz', async () => {
    pintar('/rota', [
      { path: '/', element: <p>{PANTALLA_INICIO}</p> },
      { path: '/rota', element: <Rota />, errorElement: <ErrorRuta /> },
    ]);

    screen.getByRole('button', { name: 'Ir al inicio' }).click();

    expect(await screen.findByText('pantalla de inicio')).toBeInTheDocument();
  });

  it('el error de una pantalla hija se muestra dentro del diseño del padre', () => {
    pintar('/app/rota', [
      {
        path: '/app',
        element: (
          <div>
            <nav aria-label="principal" />
            <main id="contenido">
              <Outlet />
            </main>
          </div>
        ),
        children: [
          {
            errorElement: <ErrorRuta />,
            children: [{ path: 'rota', element: <Rota /> }],
          },
        ],
      },
    ]);

    expect(screen.getByRole('navigation', { name: 'principal' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('alert'));
  });
});
