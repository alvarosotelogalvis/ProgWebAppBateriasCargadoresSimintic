import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { ErrorRestablecimiento } from '@/application/mantenimiento/restablecerApp';

import { RestablecerAppDialog } from './RestablecerAppDialog';

const boton = () => screen.getByRole('button', { name: 'Restablecer la app' });
const escribir = (texto: string) =>
  fireEvent.change(screen.getByLabelText('Escribe BORRAR para confirmar'), {
    target: { value: texto },
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RestablecerAppDialog', () => {
  it('exige escribir BORRAR antes de permitir el restablecimiento', async () => {
    const onConfirmar = vi.fn().mockResolvedValue(undefined);
    render(<RestablecerAppDialog abierto onConfirmar={onConfirmar} onCerrar={vi.fn()} />);

    expect(boton()).toBeDisabled();
    escribir('borrar ya');
    expect(boton()).toBeDisabled();
    escribir('BORRAR');
    expect(boton()).toBeEnabled();

    fireEvent.click(boton());
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledTimes(1));
  });

  it('si hay datos sin sincronizar lo explica y no hace nada más', async () => {
    const onConfirmar = vi.fn().mockRejectedValue(new ErrorRestablecimiento('pendientes'));
    render(<RestablecerAppDialog abierto onConfirmar={onConfirmar} onCerrar={vi.fn()} />);
    escribir('BORRAR');

    fireEvent.click(boton());

    expect(await screen.findByRole('alert')).toHaveTextContent('datos pendientes');
  });

  it('un error inesperado muestra un mensaje general', async () => {
    const onConfirmar = vi.fn().mockRejectedValue(new Error('boom'));
    render(<RestablecerAppDialog abierto onConfirmar={onConfirmar} onCerrar={vi.fn()} />);
    escribir('BORRAR');

    fireEvent.click(boton());

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo restablecer');
  });
});
