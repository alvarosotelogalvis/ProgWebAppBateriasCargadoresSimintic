import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { useSesionStore } from '@/shared/stores/sesionStore';

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

describe('ResponsiveNav · estructura por breakpoint y accesibilidad', () => {
  const COMPLETOS: ItemNav[] = [
    { id: 'inicio', ruta: '/', icono: 'inicio', etiquetaKey: 'Inicio', grupo: 'principal' },
    {
      id: 'servicios',
      ruta: '/servicios',
      icono: 'inicio',
      etiquetaKey: 'Servicios',
      grupo: 'principal',
    },
    {
      id: 'alertas',
      ruta: '/alertas',
      icono: 'inicio',
      etiquetaKey: 'Alertas',
      grupo: 'principal',
    },
    {
      id: 'sync',
      ruta: '/sincronizacion',
      icono: 'sincronizar',
      etiquetaKey: 'Sincronizar',
      grupo: 'principal',
    },
    { id: 'ajustes', ruta: '/ajustes', icono: 'inicio', etiquetaKey: 'Ajustes', grupo: 'mas' },
    {
      id: 'tecnico',
      ruta: '/tecnico',
      icono: 'inicio',
      etiquetaKey: 'Menú técnico',
      grupo: 'mas',
      roles: ['Administrador'],
    },
  ];

  const pintar = (breakpoint: 'compacto' | 'medio' | 'expandido', ruta = '/') => {
    vi.mocked(useBreakpoint).mockReturnValue(breakpoint);
    return render(
      <MemoryRouter initialEntries={[ruta]}>
        <ResponsiveNav items={COMPLETOS} etiquetaDe={(clave) => clave} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    useSesionStore.setState({ cuenta: null, roles: [], configuracionInicialCompleta: true });
  });

  it('compacto: barra inferior con los 4 ítems principales y sin los de «Más»', () => {
    pintar('compacto');

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.queryByRole('link', { name: /Ajustes/ })).not.toBeInTheDocument();
  });

  it('medio: riel con los ítems principales', () => {
    pintar('medio');

    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.queryByRole('link', { name: /Ajustes/ })).not.toBeInTheDocument();
  });

  it('expandido: barra lateral con los ítems de «Más» además de los principales', () => {
    pintar('expandido');

    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: /Ajustes/ })).toBeInTheDocument();
  });

  it.each(['compacto', 'medio', 'expandido'] as const)(
    '%s: el ítem de la ruta actual lleva aria-current="page" y los demás no',
    (breakpoint) => {
      pintar(breakpoint, '/servicios');

      expect(screen.getByRole('link', { name: /Servicios/ })).toHaveAttribute(
        'aria-current',
        'page'
      );
      expect(screen.getByRole('link', { name: /Inicio/ })).not.toHaveAttribute('aria-current');
    }
  );

  it('«Inicio» solo está activo en la raíz exacta', () => {
    pintar('compacto', '/servicios');

    expect(screen.getByRole('link', { name: /Inicio/ })).not.toHaveAttribute('aria-current');
  });

  it('filtra por rol: el ítem de Administrador no se muestra a otros roles', () => {
    useSesionStore.setState({ roles: ['Tecnico'] });
    pintar('expandido');

    expect(screen.queryByRole('link', { name: /Menú técnico/ })).not.toBeInTheDocument();
  });

  it('filtra por rol: el Administrador sí lo ve', () => {
    useSesionStore.setState({ roles: ['Administrador'] });
    pintar('expandido');

    expect(screen.getByRole('link', { name: /Menú técnico/ })).toBeInTheDocument();
  });
});
