import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';
import { usePreferenciasStore } from '@/features/ajustes/preferenciasStore';
import { evaluarInstalacion, type EstadoInstalacion } from '@/infrastructure/pwa/estadoInstalacion';
import { useUiStore } from '@/shared/stores/uiStore';

import { AvisoInstalar } from './AvisoInstalar';
import { InstalarPage } from './InstalarPage';

vi.mock('@/shared/ui/Icon', () => ({ Icon: () => <svg aria-hidden="true" /> }));
vi.mock('@/infrastructure/pwa/estadoInstalacion', () => ({ evaluarInstalacion: vi.fn() }));

const estado = (
  plataforma: EstadoInstalacion['plataforma'],
  requisito: EstadoInstalacion['requisito'],
  standalone = false
): void => {
  vi.mocked(evaluarInstalacion).mockReturnValue({ plataforma, requisito, standalone });
};

const pintarPagina = () =>
  render(
    <MemoryRouter initialEntries={['/instalar']}>
      <Routes>
        <Route path="/instalar" element={<InstalarPage />} />
        <Route path="/" element={<p>{'pantalla-inicio'}</p>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  useUiStore.setState({ promptInstalacionDisponible: false });
  usePreferenciasStore.setState({ bannerInstalarDescartado: false });
});

describe('InstalarPage (ES-001-01 a ES-001-04)', () => {
  it('iPhone con Safari: da los pasos de Compartir y NO deja continuar sin instalar', () => {
    estado('ios-safari', 'bloquear');

    pintarPagina();

    expect(screen.getByText(/Agregar a pantalla de inicio/)).toBeInTheDocument();
    expect(screen.getByText(/botón Compartir/)).toBeInTheDocument();
    expect(screen.queryByText('Continuar sin instalar')).not.toBeInTheDocument();
  });

  it('iPhone con otro navegador: pide abrir el enlace en Safari y tampoco deja continuar', () => {
    estado('ios-otro', 'bloquear');

    pintarPagina();

    expect(
      screen.getByText('Abre este enlace en Safari para instalar la app.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText('Continuar sin instalar')).not.toBeInTheDocument();
  });

  it('escritorio: muestra los pasos generales y permite continuar sin instalar', () => {
    estado('windows-chrome', 'advertir');

    pintarPagina();

    expect(screen.getByRole('heading', { name: 'Cómo instalar' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Continuar sin instalar'));
    expect(screen.getByText('pantalla-inicio')).toBeInTheDocument();
  });

  it('muestra INSTALAR solo si el navegador ofrece el diálogo nativo', () => {
    estado('android-chrome', 'advertir');
    const { unmount } = pintarPagina();
    expect(screen.queryByRole('button', { name: /INSTALAR/ })).not.toBeInTheDocument();
    unmount();

    useUiStore.setState({ promptInstalacionDisponible: true });
    pintarPagina();
    expect(screen.getByRole('button', { name: /INSTALAR/ })).toBeInTheDocument();
  });
});

describe('AvisoInstalar (ES-001-04)', () => {
  const pintarAviso = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AvisoInstalar />} />
          <Route path="/instalar" element={<p>{'pagina-instalar'}</p>} />
        </Routes>
      </MemoryRouter>
    );

  it('en escritorio sin instalar recomienda instalar', () => {
    estado('windows-chrome', 'advertir');

    pintarAviso();

    expect(screen.getByRole('status')).toHaveTextContent('Instala la app');
  });

  it('«Cómo instalar» lleva a la pantalla de instalación', () => {
    estado('windows-chrome', 'advertir');
    pintarAviso();

    fireEvent.click(screen.getByRole('button', { name: 'CÓMO INSTALAR' }));

    expect(screen.getByText('pagina-instalar')).toBeInTheDocument();
  });

  it('se puede descartar y no vuelve (queda guardado)', () => {
    estado('windows-chrome', 'advertir');
    pintarAviso();

    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(usePreferenciasStore.getState().bannerInstalarDescartado).toBe(true);
  });

  it.each([
    ['ya instalada', 'windows-chrome', 'no', true],
    ['iOS (ahí se bloquea, no se recomienda)', 'ios-safari', 'bloquear', false],
  ] as const)('no aparece si %s', (_caso, plataforma, requisito, standalone) => {
    estado(plataforma, requisito, standalone);

    pintarAviso();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
