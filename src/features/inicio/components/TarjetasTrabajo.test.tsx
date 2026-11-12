import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Rol } from '@/domain/servicio';
import '@/shared/i18n';
import { TarjetasTrabajo } from './TarjetasTrabajo';

vi.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));

const servicios = [
  { estado: 'RECIBIDO' as const },
  { estado: 'RECIBIDO' as const },
  { estado: 'COTIZADO' as const, cotizacionEstado: 'APROBADA' as const },
  { estado: 'COTIZADO' as const, cotizacionEstado: 'PENDIENTE' as const },
  { estado: 'ENTREGADO' as const },
];

const montar = (roles: Rol[], onAbrir = vi.fn()) => {
  render(<TarjetasTrabajo servicios={servicios} roles={roles} onAbrir={onAbrir} />);
  return onAbrir;
};

describe('TarjetasTrabajo (ES-007-31 a 33)', () => {
  it('Técnico: ve sus cuatro tarjetas con contador en el nombre accesible', () => {
    montar(['Tecnico']);

    expect(screen.getByRole('button', { name: 'Por diagnosticar (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Por orden de trabajo (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Borradores' })).toBeInTheDocument(); // 0: sin contador
    expect(screen.getByRole('button', { name: 'Por entregar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Por facturar/ })).not.toBeInTheDocument();
  });

  it('Comercial: ve diagnosticados, esperando respuesta y por facturar', () => {
    montar(['Comercial']);

    expect(screen.getByRole('button', { name: 'Esperando respuesta (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Por facturar (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Por cotizar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Por diagnosticar/ })).not.toBeInTheDocument();
  });

  it('varios roles: unión sin duplicados', () => {
    montar(['Tecnico', 'Comercial']);

    expect(screen.getAllByRole('button')).toHaveLength(7);
  });

  it('al pulsar una tarjeta avisa su clave para abrir la lista filtrada', () => {
    const onAbrir = montar(['Tecnico']);

    fireEvent.click(screen.getByRole('button', { name: 'Por diagnosticar (2)' }));

    expect(onAbrir).toHaveBeenCalledWith('recibidos');
  });

  it('sin roles no muestra nada', () => {
    montar([]);

    expect(screen.queryByRole('heading', { name: 'Mis trabajos' })).not.toBeInTheDocument();
  });
});
