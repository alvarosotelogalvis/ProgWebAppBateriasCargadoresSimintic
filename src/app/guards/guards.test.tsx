import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';

import { InstallGate } from './InstallGate';
import { RoleGuard } from './RoleGuard';
import { SetupGuard } from './SetupGuard';

const UA_IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
const UA_WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function Ruta({ nombre }: { readonly nombre: string }): React.JSX.Element {
  const { pathname, state } = useLocation();
  return (
    <div>
      {nombre}:{pathname}:{JSON.stringify(state)}
    </div>
  );
}

describe('SetupGuard (ES-001-12)', () => {
  const pintar = (ruta: string) =>
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/configuracion-inicial" element={<Ruta nombre="asistente" />} />
          <Route element={<SetupGuard />}>
            <Route path="/servicios" element={<Ruta nombre="privada" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

  beforeEach(() => {
    useSesionStore.setState({ cuenta: null, roles: [], configuracionInicialCompleta: false });
  });

  it('sin configuración inicial redirige al asistente y recuerda de dónde venía', () => {
    pintar('/servicios');

    expect(screen.getByText(/^asistente:\/configuracion-inicial:/)).toHaveTextContent(
      '"desde":"/servicios"'
    );
  });

  it('con la configuración inicial completa deja pasar', () => {
    useSesionStore.setState({ configuracionInicialCompleta: true });

    pintar('/servicios');

    expect(screen.getByText(/^privada:\/servicios/)).toBeInTheDocument();
  });
});

describe('InstallGate (FR-001-04, R-01)', () => {
  const agenteOriginal = navigator.userAgent;
  const matchMediaOriginal = window.matchMedia;

  const simular = (userAgent: string, standalone: boolean): void => {
    Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
    window.matchMedia = ((consulta: string) => ({
      matches: standalone && consulta.includes('standalone'),
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
  };

  const pintar = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/instalar" element={<Ruta nombre="instalar" />} />
          <Route element={<InstallGate />}>
            <Route path="/" element={<Ruta nombre="app" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: agenteOriginal, configurable: true });
    window.matchMedia = matchMediaOriginal;
  });

  it('iPhone en Safari sin instalar: bloquea y lleva a /instalar', () => {
    simular(UA_IPHONE_SAFARI, false);

    pintar();

    expect(screen.getByText(/^instalar:\/instalar/)).toBeInTheDocument();
  });

  it('iPhone con la app instalada: deja pasar', () => {
    simular(UA_IPHONE_SAFARI, true);

    pintar();

    expect(screen.getByText(/^app:\//)).toBeInTheDocument();
  });

  it('escritorio sin instalar: solo advierte, deja pasar', () => {
    simular(UA_WINDOWS_CHROME, false);

    pintar();

    expect(screen.getByText(/^app:\//)).toBeInTheDocument();
  });
});

describe('RoleGuard (ES-001-11)', () => {
  const pintar = () =>
    render(
      <MemoryRouter initialEntries={['/tecnico']}>
        <Routes>
          <Route element={<RoleGuard roles={['Administrador']} />}>
            <Route path="/tecnico" element={<Ruta nombre="tecnico" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

  it('sin ninguno de los roles muestra «Sin permiso» y no la pantalla', () => {
    useSesionStore.setState({
      cuenta: null,
      roles: ['Tecnico'],
      configuracionInicialCompleta: true,
    });

    pintar();

    expect(screen.getByText(/Sin permiso/i)).toBeInTheDocument();
    expect(screen.queryByText(/^tecnico:/)).not.toBeInTheDocument();
  });

  it('sin roles en la sesión tampoco deja pasar', () => {
    useSesionStore.setState({ cuenta: null, roles: [], configuracionInicialCompleta: true });

    pintar();

    expect(screen.getByText(/Sin permiso/i)).toBeInTheDocument();
  });

  it('con el rol requerido deja pasar', () => {
    useSesionStore.setState({
      cuenta: null,
      roles: ['Administrador'],
      configuracionInicialCompleta: true,
    });

    pintar();

    expect(screen.getByText(/^tecnico:\/tecnico/)).toBeInTheDocument();
  });
});
