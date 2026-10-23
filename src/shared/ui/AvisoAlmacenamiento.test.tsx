import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';
import { AvisoAlmacenamiento } from './AvisoAlmacenamiento';

const estado = vi.hoisted(() => ({ porcentaje: 90 }));

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({
    storage: {
      estimar: () =>
        Promise.resolve({
          porcentajeUsado: estado.porcentaje,
          usadoBytes: 900,
          cuotaBytes: 1000,
        }),
    },
  }),
}));

describe('AvisoAlmacenamiento', () => {
  it('avisa cuando el almacenamiento supera el umbral', async () => {
    estado.porcentaje = 90;
    render(<AvisoAlmacenamiento />);
    expect(await screen.findByText(/90\s*%/)).toBeInTheDocument();
  });

  it('no muestra nada por debajo del umbral', async () => {
    estado.porcentaje = 40;
    const { container } = render(<AvisoAlmacenamiento />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container).toBeEmptyDOMElement();
  });
});
