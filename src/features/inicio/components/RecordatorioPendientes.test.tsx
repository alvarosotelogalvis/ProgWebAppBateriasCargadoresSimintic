import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { RecordatorioPendientes } from './RecordatorioPendientes';

const AHORA = Date.parse('2026-11-06T12:00:00.000Z');
const hace = (horas: number) => new Date(AHORA - horas * 60 * 60 * 1000).toISOString();

describe('RecordatorioPendientes (ES-005-22)', () => {
  it('muestra la antigüedad en horas y el botón Sincronizar', () => {
    const onSincronizar = vi.fn();
    render(
      <RecordatorioPendientes
        cantidad={2}
        masAntiguoEn={hace(30)}
        umbralHoras={24}
        ahoraMs={AHORA}
        onSincronizar={onSincronizar}
      />
    );

    expect(
      screen.getByText('Tienes 2 registros sin sincronizar desde hace 30 horas.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SINCRONIZAR' }));
    expect(onSincronizar).toHaveBeenCalled();
  });

  it('expresa en días las antigüedades de 48 h o más', () => {
    render(
      <RecordatorioPendientes
        cantidad={1}
        masAntiguoEn={hace(75)}
        umbralHoras={24}
        ahoraMs={AHORA}
        onSincronizar={vi.fn()}
      />
    );
    expect(
      screen.getByText('Tienes 1 registro sin sincronizar desde hace 3 días.')
    ).toBeInTheDocument();
  });

  it('no aparece por debajo del umbral ni sin pendientes', () => {
    const { container, rerender } = render(
      <RecordatorioPendientes
        cantidad={2}
        masAntiguoEn={hace(10)}
        umbralHoras={24}
        ahoraMs={AHORA}
        onSincronizar={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <RecordatorioPendientes
        cantidad={0}
        umbralHoras={24}
        ahoraMs={AHORA}
        onSincronizar={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
