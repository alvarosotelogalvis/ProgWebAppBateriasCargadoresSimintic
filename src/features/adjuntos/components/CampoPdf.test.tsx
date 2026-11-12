import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AgregarPdfResultado, TipoPdf } from '@/application/adjuntos/agregarPdf';
import '@/shared/i18n';
import { adjuntoBuilder } from '../../../../tests/builders/adjuntoBuilder';
import { CampoPdf } from './CampoPdf';

const archivo = () => new File(['%PDF-1.4'], 'diag.pdf', { type: 'application/pdf' });

const montar = (
  props: Partial<React.ComponentProps<typeof CampoPdf>> & {
    onAgregar?: (archivo: File, tipo: TipoPdf) => Promise<AgregarPdfResultado>;
  } = {}
) => {
  const onAgregar = vi.fn(props.onAgregar ?? (async () => ({ ok: true }) as AgregarPdfResultado));
  const onEliminar = vi.fn(async () => undefined);
  const vista = render(
    <CampoPdf
      tipo="FORMATO_DIAGNOSTICO"
      etiqueta="Formato de diagnóstico (PDF)"
      textoAdjuntar="Adjuntar PDF"
      adjuntos={[]}
      maxMB={20}
      {...props}
      onAgregar={onAgregar}
      onEliminar={onEliminar}
    />
  );
  return { ...vista, onAgregar, onEliminar };
};

const elegir = (contenedor: HTMLElement) =>
  fireEvent.change(contenedor.querySelector('input[type="file"]')!, {
    target: { files: [archivo()] },
  });

describe('CampoPdf', () => {
  it('sin adjunto ofrece "Adjuntar PDF"', () => {
    montar();

    expect(screen.getByRole('button', { name: 'Adjuntar PDF' })).toBeInTheDocument();
  });

  it('entrega el archivo elegido y el tipo a onAgregar', async () => {
    const { container, onAgregar } = montar();

    elegir(container);

    await waitFor(() => expect(onAgregar).toHaveBeenCalledTimes(1));
    expect(onAgregar.mock.calls[0]?.[1]).toBe('FORMATO_DIAGNOSTICO');
  });

  it.each([
    ['NO_ES_PDF', 'El archivo no es un PDF válido.'],
    ['TAMANO_EXCEDIDO', 'El PDF supera el tamaño máximo de 20 MB.'],
    ['ALMACENAMIENTO_LLENO', 'No hay espacio suficiente en el dispositivo.'],
  ] as const)('muestra el error %s', async (error, texto) => {
    const { container } = montar({ onAgregar: async () => ({ ok: false, error }) });

    elegir(container);

    expect(await screen.findByRole('alert')).toHaveTextContent(texto);
  });

  it('muestra un error genérico si onAgregar falla', async () => {
    const { container } = montar({
      onAgregar: async () => {
        throw new Error('boom');
      },
    });

    elegir(container);

    expect(await screen.findByRole('alert')).toHaveTextContent('Error al adjuntar el PDF.');
  });

  it('con adjunto muestra el documento en lugar del botón y permite eliminarlo', async () => {
    const adjunto = adjuntoBuilder({
      id: 'pdf-1',
      tipo: 'FORMATO_DIAGNOSTICO',
      mime: 'application/pdf',
    }).construir();
    const { onEliminar } = montar({ adjuntos: [adjunto] });

    expect(screen.queryByRole('button', { name: 'Adjuntar PDF' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar PDF' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() => expect(onEliminar).toHaveBeenCalledWith('pdf-1'));
  });

  it('ignora los adjuntos de otro tipo o marcados para eliminar', () => {
    montar({
      adjuntos: [
        adjuntoBuilder({ id: 'a', tipo: 'COTIZACION', mime: 'application/pdf' }).construir(),
        adjuntoBuilder({
          id: 'b',
          tipo: 'FORMATO_DIAGNOSTICO',
          mime: 'application/pdf',
          eliminarRemoto: true,
        }).construir(),
      ],
    });

    expect(screen.getByRole('button', { name: 'Adjuntar PDF' })).toBeInTheDocument();
  });

  it('en solo lectura sin adjunto no ofrece adjuntar', () => {
    montar({ soloLectura: true });

    expect(screen.queryByRole('button', { name: 'Adjuntar PDF' })).not.toBeInTheDocument();
  });
});
