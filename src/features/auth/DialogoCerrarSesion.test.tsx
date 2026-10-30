import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { DialogoCerrarSesion } from './DialogoCerrarSesion';

describe('DialogoCerrarSesion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra advertencia si hay pendientes y confirma', () => {
    const onConfirmar = vi.fn();
    const onCancelar = vi.fn();

    render(
      <DialogoCerrarSesion
        abierto
        pendientes={2}
        onConfirmar={onConfirmar}
        onCancelar={onCancelar}
      />
    );

    expect(screen.getByText(/tienes 2 registros pendientes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /CERRAR SESIÓN/i }));
    expect(onConfirmar).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onCancelar).toHaveBeenCalled();
  });

  it('no muestra advertencia si no hay pendientes', () => {
    render(
      <DialogoCerrarSesion abierto pendientes={0} onConfirmar={vi.fn()} onCancelar={vi.fn()} />
    );

    expect(screen.queryByText(/sin sincronizar/i)).not.toBeInTheDocument();
  });
});
