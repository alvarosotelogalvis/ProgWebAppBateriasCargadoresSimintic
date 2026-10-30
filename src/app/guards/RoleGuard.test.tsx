import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';

import { RoleGuard } from './RoleGuard';

const contenidoPrivado = 'privado';

describe('RoleGuard', () => {
  beforeEach(() => {
    useSesionStore.setState({ cuenta: null, roles: [], configuracionInicialCompleta: false });
  });

  it('muestra sin permiso si el usuario no tiene rol', () => {
    useSesionStore.setState({
      cuenta: null,
      roles: ['Tecnico'],
      configuracionInicialCompleta: false,
    });

    render(
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route element={<RoleGuard roles={['Administrador']} />}>
            <Route path="/privado" element={<div>{contenidoPrivado}</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Sin permiso/i)).toBeInTheDocument();
  });

  it('permite el acceso si tiene alguno de los roles', () => {
    useSesionStore.setState({
      cuenta: null,
      roles: ['Administrador'],
      configuracionInicialCompleta: false,
    });

    render(
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route element={<RoleGuard roles={['Administrador', 'Comercial']} />}>
            <Route path="/privado" element={<div>{contenidoPrivado}</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('privado')).toBeInTheDocument();
  });
});
