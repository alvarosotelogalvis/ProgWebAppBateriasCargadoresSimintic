import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useBreakpoint } from '@/shared/hooks/useBreakpoint';

import { ResponsiveNav, type ItemNav } from './ResponsiveNav';

vi.mock('@/shared/hooks/useBreakpoint', () => ({ useBreakpoint: vi.fn(() => 'compacto') }));
vi.mock('@/shared/ui/Icon', () => ({ Icon: () => <svg aria-hidden="true" /> }));

const ITEMS: ItemNav[] = [
  { id: 'inicio', ruta: '/', icono: 'inicio', etiquetaKey: 'Inicio', grupo: 'principal' },
  {
    id: 'sincronizar',
    ruta: '/sincronizacion',
    icono: 'sincronizar',
    etiquetaKey: 'Sincronizar',
    grupo: 'principal',
    badge: 3,
  },
];

describe('ResponsiveNav', () => {
  it.each(['compacto', 'medio', 'expandido'] as const)(
    'muestra el número de pendientes en Sincronizar (%s, ES-005-23)',
    (breakpoint) => {
      vi.mocked(useBreakpoint).mockReturnValue(breakpoint);
      render(
        <MemoryRouter>
          <ResponsiveNav items={ITEMS} etiquetaDe={(clave) => clave} />
        </MemoryRouter>
      );
      expect(screen.getByRole('link', { name: /Sincronizar/ })).toHaveTextContent('3');
    }
  );
});
