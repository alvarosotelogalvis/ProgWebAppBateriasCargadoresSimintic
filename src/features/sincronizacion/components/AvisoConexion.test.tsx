import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import * as containerContext from '@/app/containerContext';
import { useUiStore } from '@/shared/stores/uiStore';

import { AvisoConexion } from './AvisoConexion';

vi.mock('@/app/containerContext', () => ({ useContainer: vi.fn() }));

const sincronizar = vi.fn();

function renderAviso(ruta = '/') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/sincronizacion" element={<p data-testid="pantalla-sync" />} />
        <Route path="*" element={<AvisoConexion />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  sincronizar.mockReset();
  useUiStore.getState().setPendientes(4);
  vi.mocked(containerContext.useContainer).mockReturnValue({
    sesionSyncVigente: async () => true,
    sync: { sincronizar },
  } as never);
});

describe('AvisoConexion', () => {
  it('pregunta antes de sincronizar y lleva a Sincronización (ES-005-21)', async () => {
    renderAviso();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(await screen.findByText('Tienes 4 pendientes. ¿Sincronizar ahora?')).toBeInTheDocument();
    expect(sincronizar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'SINCRONIZAR AHORA' }));
    expect(await screen.findByTestId('pantalla-sync')).toBeInTheDocument();
    expect(sincronizar).not.toHaveBeenCalled();
  });

  it('se puede descartar', async () => {
    renderAviso();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Ahora no' }));
    await waitFor(() => expect(screen.queryByText(/¿Sincronizar ahora\?/)).not.toBeInTheDocument());
  });
});
