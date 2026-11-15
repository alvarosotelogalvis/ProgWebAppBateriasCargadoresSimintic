import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import type { Servicio } from '@/domain/servicio';

import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { BannerConflicto } from './BannerConflicto';

let servicio: Servicio | undefined;
vi.mock('@/infrastructure/db/hooks', () => ({ useServicio: () => servicio }));
vi.mock('@/shared/ui/Icon', () => ({ Icon: () => <svg aria-hidden="true" /> }));

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/servicios/s1']}>
      <Routes>
        <Route path="/servicios/:id" element={<BannerConflicto servicioId="s1" />} />
        <Route path="/sincronizacion/conflicto/s1" element={<i data-testid="destino-resolver" />} />
      </Routes>
    </MemoryRouter>
  );

describe('BannerConflicto (ES-006-07)', () => {
  it('avisa con los nombres de los campos y lleva a resolver', () => {
    servicio = {
      ...servicioBuilder().diagnosticado().construir(),
      syncState: 'conflict',
      conflictos: [{ campo: 'marca', local: 'A', remoto: 'B' }],
    };
    abrir();

    expect(screen.getByRole('alert')).toHaveTextContent('1 conflicto: Marca');
    fireEvent.click(screen.getByRole('button', { name: 'RESOLVER' }));
    expect(screen.getByTestId('destino-resolver')).toBeInTheDocument();
  });

  it('no aparece si el servicio no está en conflicto', () => {
    servicio = servicioBuilder().diagnosticado().sincronizado().construir();
    abrir();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
