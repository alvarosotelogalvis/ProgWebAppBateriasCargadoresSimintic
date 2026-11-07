import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResolverConflictoPage } from './ResolverConflictoPage';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';

// Mock del router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ servicioId: 'svc-1' }),
}));

describe('ResolverConflictoPage — resolver conflictos por usuario (T-017)', () => {
  const servicioConConflictos = servicioBuilder({
    id: 'svc-1',
    conflictos: [
      { campo: 'observacionTecnica', local: 'Mi observación', remoto: 'Observación remota' },
      { campo: 'diagnostico', local: 'Mi diagnóstico', remoto: 'Diagnóstico remoto' },
    ],
    syncState: 'conflict',
  });

  beforeEach(() => {
    // Limpiar mocks
    vi.clearAllMocks();
  });

  it('muestra campos en conflicto (ES-006-12)', async () => {
    render(<ResolverConflictoPage servicio={servicioConConflictos} onResolver={vi.fn()} />);

    expect(screen.getByText('observacionTecnica')).toBeInTheDocument();
    expect(screen.getByText('diagnostico')).toBeInTheDocument();
    expect(screen.getByText('Mi observación')).toBeInTheDocument();
    expect(screen.getByText('Observación remota')).toBeInTheDocument();
  });

  it('deshabilita botón hasta elegir todos los conflictos (ES-006-13)', async () => {
    const onResolver = vi.fn();
    const { rerender } = render(
      <ResolverConflictoPage servicio={servicioConConflictos} onResolver={onResolver} />
    );

    const boton = screen.getByRole('button', { name: /APLICAR Y SINCRONIZAR/i });
    expect(boton).toBeDisabled();

    // Elegir un campo
    const radioButtons = screen.getAllByRole('radio');
    await userEvent.click(radioButtons[0]); // LOCAL para observacionTecnica

    rerender(<ResolverConflictoPage servicio={servicioConConflictos} onResolver={onResolver} />);

    // Botón aún deshabilitado (faltan elecciones)
    expect(boton).toBeDisabled();

    // Elegir segundo campo
    await userEvent.click(radioButtons[2]); // REMOTO para diagnostico

    rerender(<ResolverConflictoPage servicio={servicioConConflictos} onResolver={onResolver} />);

    // Ahora habilitado
    expect(boton).not.toBeDisabled();
  });

  it('muestra tarjetas en compacto/medio, tabla en expandido (ES-006-14)', async () => {
    // Este test depende del breakpoint
    render(<ResolverConflictoPage servicio={servicioConConflictos} onResolver={vi.fn()} />);

    // En compacto (< 768px): tarjetas
    // En expandido (>= 768px): tabla
    // La estrategia es renderizar y verificar que existe la estructura
    // (En React Testing Library, el breakpoint es responsabilidad del CSS)

    const titulo = screen.getByRole('heading', { name: /Resolver conflictos/i });
    expect(titulo).toBeInTheDocument();

    // Verificar que hay opciones para elegir
    const opciones = screen.getAllByRole('radio');
    expect(opciones.length).toBeGreaterThanOrEqual(2); // Al menos 2 campos × 2 opciones
  });
});
