import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { FormRecepcion } from './FormRecepcion';

vi.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));
vi.mock('@/infrastructure/db/hooks', () => ({
  useCatalogo: (clave: string) =>
    clave === 'clientes'
      ? [{ id: 1, nombre: 'Navar Asociados', activo: true }]
      : ['ROQUET', 'TROJAN'],
  useServicios: () => [],
}));

const escribir = (etiqueta: RegExp | string, valor: string): void => {
  fireEvent.input(screen.getByLabelText(etiqueta), { target: { value: valor } });
};

const escribirCombo = (nombre: string, valor: string): void => {
  fireEvent.input(screen.getByRole('combobox', { name: nombre }), { target: { value: valor } });
};

const elegirCliente = (): void => {
  const combo = screen.getByRole('combobox', { name: 'Cliente' });
  fireEvent.input(combo, { target: { value: 'navar' } });
  fireEvent.keyDown(combo, { key: 'ArrowDown' });
  fireEvent.keyDown(combo, { key: 'Enter' });
};

function renderFormulario(overrides: {
  readonly totalFotos?: number;
  readonly minFotos?: number;
  readonly onGuardar?: () => Promise<unknown>;
  readonly onCompletar?: () => Promise<void>;
}): {
  readonly onGuardar: ReturnType<typeof vi.fn>;
  readonly onCompletar: ReturnType<typeof vi.fn>;
} {
  const onGuardar = vi.fn(overrides.onGuardar ?? (() => Promise.resolve()));
  const onCompletar = vi.fn(overrides.onCompletar ?? (() => Promise.resolve()));
  render(
    <FormRecepcion
      servicio={servicioBuilder().borrador().construir()}
      hoy="2026-10-22"
      totalFotos={overrides.totalFotos ?? 1}
      minFotos={overrides.minFotos ?? 1}
      onGuardar={onGuardar}
      onCompletar={onCompletar}
    />
  );
  return { onGuardar, onCompletar };
}

function completarCampos(): void {
  elegirCliente();
  escribirCombo('Marca', 'ROQUET');
  escribir(/^Referencia$/, 'REF-1');
  escribir(/^Serie$/, 'SERIE-1');
  escribir(/número de solicitud/i, '55');
}

describe('FormRecepcion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra los faltantes al intentar completar y no avanza', async () => {
    const { onCompletar } = renderFormulario({});

    fireEvent.click(screen.getByRole('button', { name: /Completar recepción/i }));

    expect(await screen.findByText(/Faltan datos/i)).toBeInTheDocument();
    expect(onCompletar).not.toHaveBeenCalled();
  });

  it('no completa si faltan fotos', async () => {
    const { onCompletar } = renderFormulario({ totalFotos: 0, minFotos: 1 });
    completarCampos();

    fireEvent.click(screen.getByRole('button', { name: /Completar recepción/i }));

    expect(await screen.findByText(/Agrega al menos 1 foto/i)).toBeInTheDocument();
    expect(onCompletar).not.toHaveBeenCalled();
  });

  it('guarda y completa cuando los datos son validos', async () => {
    const { onGuardar, onCompletar } = renderFormulario({});
    completarCampos();

    fireEvent.click(screen.getByRole('button', { name: /Completar recepción/i }));

    await waitFor(() => expect(onCompletar).toHaveBeenCalledTimes(1));
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 1,
        clienteNombre: 'Navar Asociados',
        marca: 'ROQUET',
        referencia: 'REF-1',
        serie: 'SERIE-1',
        numeroSolicitud: 55,
      })
    );
  });

  it('describe los errores de los campos accesibles', async () => {
    renderFormulario({});
    fireEvent.click(screen.getByRole('button', { name: /Completar recepción/i }));
    const serie = screen.getByLabelText(/^Serie$/);
    expect(serie).toHaveAttribute('aria-describedby');
    expect(screen.getAllByText('La serie es obligatoria.').length).toBeGreaterThan(0);
  });
});
