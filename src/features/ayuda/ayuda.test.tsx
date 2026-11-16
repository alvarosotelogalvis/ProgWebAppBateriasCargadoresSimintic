import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import ayuda from '@/locales/es-CO/ayuda.json';
import '@/shared/i18n';
import { AyudaPage } from './AyudaPage';
import { AyudaTemaPage } from './AyudaTemaPage';
import { esTemaAyuda, TEMAS_AYUDA } from './temas';

vi.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));

const temas = ayuda.temas as Record<string, { titulo: string; cuerpo: string; pasos: string[] }>;

describe('ayuda in-app', () => {
  it.each(TEMAS_AYUDA)('el tema %s tiene título, cuerpo y al menos un paso', (tema) => {
    const contenido = temas[tema];

    expect(contenido?.titulo.length).toBeGreaterThan(0);
    expect(contenido?.cuerpo.length).toBeGreaterThan(0);
    expect(contenido?.pasos.length).toBeGreaterThan(0);
  });

  it('todos los temas del JSON están en la lista (no quedan temas huérfanos)', () => {
    expect(Object.keys(temas).sort()).toEqual([...TEMAS_AYUDA].sort());
  });

  it('reconoce solo temas válidos', () => {
    expect(esTemaAyuda('etapas-servicio')).toBe(true);
    expect(esTemaAyuda('inventado')).toBe(false);
    expect(esTemaAyuda(undefined)).toBe(false);
  });

  it('la página de ayuda lista todos los temas', () => {
    render(
      <MemoryRouter>
        <AyudaPage />
      </MemoryRouter>
    );

    for (const tema of TEMAS_AYUDA) {
      expect(screen.getByText(temas[tema]!.titulo)).toBeInTheDocument();
    }
  });

  it('el tema de etapas explica el flujo y los roles', () => {
    render(
      <MemoryRouter initialEntries={['/ayuda/etapas-servicio']}>
        <Routes>
          <Route path="/ayuda/:tema" element={<AyudaTemaPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: 'Etapas de un servicio y quién las hace' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Recepción \(Técnico\)/)).toBeInTheDocument();
    expect(screen.getByText(/Facturación \(Comercial\)/)).toBeInTheDocument();
  });

  it('un tema desconocido muestra "Tema no encontrado"', () => {
    render(
      <MemoryRouter initialEntries={['/ayuda/inventado']}>
        <Routes>
          <Route path="/ayuda/:tema" element={<AyudaTemaPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Tema no encontrado')).toBeInTheDocument();
  });
});
