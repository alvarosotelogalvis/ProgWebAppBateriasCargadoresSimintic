import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import '@/shared/i18n';
import { VARIABLE_ESCALA } from '@/app/escalaFuente';

import { AjustesPage } from './AjustesPage';
import { aplicarEscalaGuardada, usePreferenciasStore } from './preferenciasStore';

const escalaAplicada = (): string =>
  document.documentElement.style.getPropertyValue(VARIABLE_ESCALA);
const guardado = (): { state: { escalaFuente: number } } | null => {
  const crudo = window.localStorage.getItem('stbc-preferencias');
  return crudo ? (JSON.parse(crudo) as { state: { escalaFuente: number } }) : null;
};

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.style.removeProperty(VARIABLE_ESCALA);
  usePreferenciasStore.setState({ escalaFuente: 1, bannerInstalarDescartado: false });
});

describe('AjustesPage (HU-001-3)', () => {
  it('ofrece solo el tamaño de fuente (sin selector de tema) con «Normal» marcado', () => {
    render(<AjustesPage />);

    expect(screen.getByRole('radiogroup', { name: 'Tamaño de fuente' })).toBeInTheDocument();
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
    expect(screen.queryByText(/tema|oscuro/i)).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();
  });

  it.each([
    ['Grande', 1.15],
    ['Muy grande', 1.3],
  ])('«%s» aplica la escala %s de inmediato en <html>', (nombre, escala) => {
    render(<AjustesPage />);

    fireEvent.click(screen.getByRole('radio', { name: nombre }));

    expect(escalaAplicada()).toBe(String(escala));
    expect(screen.getByRole('radio', { name: nombre })).toBeChecked();
  });

  it('persiste la elección en el dispositivo', () => {
    render(<AjustesPage />);

    fireEvent.click(screen.getByRole('radio', { name: 'Grande' }));

    expect(guardado()?.state.escalaFuente).toBe(1.15);
  });

  it('solo guarda las preferencias permitidas (escala y banner de instalación)', () => {
    render(<AjustesPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Grande' }));

    expect(Object.keys(guardado()?.state ?? {}).sort()).toEqual([
      'bannerInstalarDescartado',
      'escalaFuente',
    ]);
  });

  it('al recargar, la escala guardada se aplica antes del primer render', async () => {
    window.localStorage.setItem(
      'stbc-preferencias',
      JSON.stringify({ state: { escalaFuente: 1.3, bannerInstalarDescartado: false }, version: 0 })
    );

    // Simula el arranque: el almacén se rehidrata desde localStorage y se aplica la escala.
    await usePreferenciasStore.persist.rehydrate();
    aplicarEscalaGuardada();

    expect(usePreferenciasStore.getState().escalaFuente).toBe(1.3);
    expect(escalaAplicada()).toBe('1.3');
  });

  it('al rehidratar el almacén aplica la escala sin que nadie lo pida', async () => {
    window.localStorage.setItem(
      'stbc-preferencias',
      JSON.stringify({ state: { escalaFuente: 1.15, bannerInstalarDescartado: false }, version: 0 })
    );

    await usePreferenciasStore.persist.rehydrate();

    expect(escalaAplicada()).toBe('1.15');
  });
});
