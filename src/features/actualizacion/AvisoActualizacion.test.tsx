import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';
import { useUiStore } from '@/shared/stores/uiStore';

import { AvisoActualizacion } from './AvisoActualizacion';

const aplicarNuevaVersion = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/infrastructure/pwa/registerSW', () => ({
  registrarServiceWorker: vi.fn(() => ({ aplicar: aplicarNuevaVersion })),
  aplicarNuevaVersion,
}));

beforeEach(() => {
  aplicarNuevaVersion.mockClear();
  useUiStore.setState({
    hayNuevaVersion: false,
    bloqueosActualizacion: new Set<string>(),
    toasts: [],
  });
});

describe('AvisoActualizacion (HU-001-5, T-23)', () => {
  it('sin versión nueva no muestra nada', () => {
    const { container } = render(<AvisoActualizacion />);

    expect(container).toBeEmptyDOMElement();
  });

  it('con versión nueva avisa y ofrece ACTUALIZAR', () => {
    useUiStore.setState({ hayNuevaVersion: true });

    render(<AvisoActualizacion />);

    expect(screen.getByText('Hay una nueva versión disponible.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ACTUALIZAR' })).toBeInTheDocument();
  });

  it('sin trabajo en curso aplica la actualización ', async () => {
    useUiStore.setState({ hayNuevaVersion: true });
    render(<AvisoActualizacion />);

    fireEvent.click(screen.getByRole('button', { name: 'ACTUALIZAR' }));

    await waitFor(() => expect(aplicarNuevaVersion).toHaveBeenCalledTimes(1));
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it('con un formulario abierto (bloqueo) espera: avisa y NO recarga', async () => {
    useUiStore.setState({
      hayNuevaVersion: true,
      bloqueosActualizacion: new Set(['formulario-recepcion']),
    });
    render(<AvisoActualizacion />);

    fireEvent.click(screen.getByRole('button', { name: 'ACTUALIZAR' }));

    expect(useUiStore.getState().toasts).toEqual([
      expect.objectContaining({
        mensaje: 'Se actualizará al terminar lo que estás haciendo.',
        tipo: 'info',
      }),
    ]);
    await Promise.resolve();
    expect(aplicarNuevaVersion).not.toHaveBeenCalled();
  });

  it('al liberarse el bloqueo, el siguiente intento sí aplica', async () => {
    useUiStore.setState({
      hayNuevaVersion: true,
      bloqueosActualizacion: new Set(['formulario-recepcion']),
    });
    render(<AvisoActualizacion />);
    fireEvent.click(screen.getByRole('button', { name: 'ACTUALIZAR' }));
    expect(aplicarNuevaVersion).not.toHaveBeenCalled();

    act(() => useUiStore.getState().liberarActualizacion('formulario-recepcion'));
    fireEvent.click(screen.getByRole('button', { name: 'ACTUALIZAR' }));

    await waitFor(() => expect(aplicarNuevaVersion).toHaveBeenCalledTimes(1));
  });
});
