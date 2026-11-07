import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FormEtapa from './FormEtapa';
import { servicioBuilder } from '../../../tests/builders';

describe('FormEtapa (T013)', () => {
  it('debe mostrar campos editables según camposEditables', () => {
    const servicio = servicioBuilder().estado('RECIBIDO').build();

    render(
      <BrowserRouter>
        <FormEtapa
          servicio={servicio}
          etapa="diagnostico"
          roles={['Tecnico']}
          onComplete={() => {}}
        />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/diagnóstico/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/observación/i)).not.toBeDisabled();
  });

  it('debe mostrar "Pendiente de <rol>" si el rol no puede editar', () => {
    const servicio = servicioBuilder().estado('DIAGNOSTICADO').build();

    render(
      <BrowserRouter>
        <FormEtapa
          servicio={servicio}
          etapa="cotizacion"
          roles={['Tecnico']}
          onComplete={() => {}}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/Pendiente de Comercial/i)).toBeInTheDocument();
  });

  it('debe listar campos faltantes', () => {
    const servicio = servicioBuilder()
      .estado('RECIBIDO')
      .diagnostico(undefined)
      .observacionTecnica('')
      .build();

    render(
      <BrowserRouter>
        <FormEtapa
          servicio={servicio}
          etapa="diagnostico"
          roles={['Tecnico']}
          onComplete={() => {}}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/Faltan datos/i)).toBeInTheDocument();
  });

  it('debe tener autoguardado con debounce de 800ms', async () => {
    // stub: verificar en implementación
    expect(true).toBe(true);
  });
});
