import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';

import { ResponsiveDialog } from './ResponsiveDialog';

vi.mock('@/shared/hooks/useBreakpoint', () => ({ useBreakpoint: vi.fn(() => 'compacto') }));

const pintar = (abierto = true, alCerrar = vi.fn()) =>
  render(
    <ResponsiveDialog titulo="Confirmar" abierto={abierto} onCerrar={alCerrar}>
      <button type="button">Aceptar</button>
    </ResponsiveDialog>
  );

describe('ResponsiveDialog', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoint).mockReturnValue('compacto');
  });

  it('cerrado no pinta nada', () => {
    pintar(false);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto es un diálogo con nombre y título visible', () => {
    pintar();

    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Confirmar' })).toBeInTheDocument();
  });

  it('compacto: se presenta como hoja inferior con asa', () => {
    const { baseElement } = pintar();

    expect(baseElement.querySelector('[class*="overlayHoja"]')).not.toBeNull();
    expect(baseElement.querySelector('[class*="asa"]')).not.toBeNull();
  });

  it.each(['medio', 'expandido'] as const)('%s: se presenta como ventana modal, sin asa', (bp) => {
    vi.mocked(useBreakpoint).mockReturnValue(bp);
    const { baseElement } = pintar();

    expect(baseElement.querySelector('[class*="overlayHoja"]')).toBeNull();
    expect(baseElement.querySelector('[class*="asa"]')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Esc cierra el diálogo', () => {
    const alCerrar = vi.fn();
    pintar(true, alCerrar);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('el botón de cerrar tiene nombre accesible y cierra', () => {
    const alCerrar = vi.fn();
    pintar(true, alCerrar);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('atrapa el foco: el foco entra al diálogo y el resto de la página queda inerte', async () => {
    render(
      <>
        <button type="button">Fondo</button>
        <ResponsiveDialog titulo="Confirmar" abierto onCerrar={vi.fn()}>
          <button type="button">Aceptar</button>
        </ResponsiveDialog>
      </>
    );

    await waitFor(() =>
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    );
    expect(screen.queryByRole('button', { name: 'Fondo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fondo', hidden: true })).toBeInTheDocument();
  });
});
