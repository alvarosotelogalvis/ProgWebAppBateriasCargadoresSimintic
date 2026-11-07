import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import type { ColaSync } from '@/infrastructure/db/hooks';

import { ResumenCola } from './ResumenCola';

vi.mock('@/shared/ui/Icon', () => ({ Icon: () => <svg aria-hidden="true" /> }));

const COLA: ColaSync = {
  total: 10,
  sincronizados: 7,
  enCola: [
    {
      id: 'p1',
      codigo: 'CAR-1',
      descripcion: 'Acme · Trojan',
      syncState: 'pending',
      intentos: 0,
    },
  ],
  conError: [
    {
      id: 'e1',
      codigo: 'BAT-2',
      descripcion: 'Acme',
      syncState: 'error',
      intentos: 8,
      ultimoError: { codigo: 'SP_SIN_PERMISO', mensaje: '403', en: '2026-11-06T10:00:00Z' },
    },
    {
      id: 'e2',
      codigo: 'BAT-3',
      descripcion: '',
      syncState: 'error',
      intentos: 1,
      ultimoError: { codigo: 'RARO', mensaje: 'Mensaje del servidor', en: '2026-11-06T10:00:00Z' },
    },
  ],
  conflictos: [{ id: 'c1', codigo: 'BAT-4', descripcion: '', syncState: 'conflict', intentos: 0 }],
};

describe('ResumenCola', () => {
  it('muestra el % sincronizado y la cola por defecto', () => {
    render(<ResumenCola cola={COLA} porcentajeEnCurso={null} onReintentar={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Sincronizado: 70%' })).toBeInTheDocument();
    expect(screen.getByText('7 de 10 registros sincronizados')).toBeInTheDocument();
    expect(screen.getByText('CAR-1')).toBeInTheDocument();
    expect(screen.queryByText('BAT-2')).not.toBeInTheDocument();
  });

  it('usa el avance de la ejecución en curso cuando existe', () => {
    render(<ResumenCola cola={COLA} porcentajeEnCurso={40} onReintentar={vi.fn()} />);
    expect(
      screen.getByRole('img', { name: 'Avance de la sincronización: 40%' })
    ).toBeInTheDocument();
  });

  it('lista los errores con un mensaje comprensible y permite reintentar (ES-005-17)', () => {
    const onReintentar = vi.fn();
    render(<ResumenCola cola={COLA} porcentajeEnCurso={null} onReintentar={onReintentar} />);

    fireEvent.click(screen.getByRole('radio', { name: /Con error/ }));

    expect(
      screen.getByText('Tu cuenta no tiene permiso en el sitio de SharePoint.')
    ).toBeInTheDocument();
    expect(screen.getByText('Mensaje del servidor')).toBeInTheDocument();
    expect(screen.getByText('8 intentos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar BAT-2' }));
    expect(onReintentar).toHaveBeenCalledWith('e1');
  });

  it('muestra los conflictos y un estado vacío en cada segmento', () => {
    render(
      <ResumenCola cola={{ ...COLA, enCola: [] }} porcentajeEnCurso={null} onReintentar={vi.fn()} />
    );
    expect(screen.getByText('No hay registros en cola')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Conflictos/ }));
    expect(screen.getByText('BAT-4')).toBeInTheDocument();
  });
});
