import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { AlertasPage } from './AlertasPage';
import i18n from '@/locales/i18n';

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({
    db: {
      servicios: {
        where: () => ({
          anyOf: () => ({
            toArray: async () => [],
          }),
        }),
      },
      catalogos: {
        where: () => ({
          equals: () => ({
            toArray: async () => [],
          }),
        }),
      },
    },
  }),
}));

describe('AlertasPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const renderPage = () => {
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AlertasPage />
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  it('renderiza las pestañas', () => {
    renderPage();
    expect(screen.getByText(/Vencidas/)).toBeInTheDocument();
    expect(screen.getByText(/≤30 días/)).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando no hay alertas', () => {
    renderPage();
    expect(screen.getByText(/sinAlertas|sin alertas/i)).toBeInTheDocument();
  });
});
