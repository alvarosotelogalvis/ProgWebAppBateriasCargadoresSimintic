import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TablaResponsive } from './TablaResponsive';

describe('TablaResponsive — tabla responsiva (T-017)', () => {
  const datos = [
    { id: '1', nombre: 'Campo A', valor: 'Valor 1', opcion: 'LOCAL' },
    { id: '2', nombre: 'Campo B', valor: 'Valor 2', opcion: 'REMOTO' },
  ];

  it('renderiza tabla con th scope en expandido (ES-006-15)', () => {
    const { container } = render(
      <TablaResponsive
        datos={datos}
        columnas={[
          { clave: 'nombre', etiqueta: 'Campo' },
          { clave: 'valor', etiqueta: 'Valor' },
          { clave: 'opcion', etiqueta: 'Opción' },
        ]}
      />
    );

    // Verificar que existe tabla
    const tabla = container.querySelector('table');
    expect(tabla).toBeInTheDocument();

    // Verificar encabezados con scope
    const encabezados = container.querySelectorAll('th[scope="col"]');
    expect(encabezados.length).toBeGreaterThanOrEqual(3);
  });

  it('renderiza tarjetas en compacto con etiqueta por celda (ES-006-16)', () => {
    const { container } = render(
      <TablaResponsive
        datos={datos}
        columnas={[
          { clave: 'nombre', etiqueta: 'Campo' },
          { clave: 'valor', etiqueta: 'Valor' },
        ]}
        breakpoint="compact"
      />
    );

    // En compacto: estructura de tarjetas
    const tarjetas = container.querySelectorAll('[data-testid="tabla-tarjeta"]');
    expect(tarjetas.length).toBeGreaterThan(0);

    // Cada tarjeta tiene etiquetas
    const etiquetas = container.querySelectorAll('[data-testid="tarjeta-etiqueta"]');
    expect(etiquetas.length).toBeGreaterThan(0);
  });

  it('muestra datos correctamente (ES-006-17)', () => {
    render(
      <TablaResponsive
        datos={datos}
        columnas={[
          { clave: 'nombre', etiqueta: 'Campo' },
          { clave: 'valor', etiqueta: 'Valor' },
        ]}
      />
    );

    expect(screen.getByText('Campo A')).toBeInTheDocument();
    expect(screen.getByText('Valor 1')).toBeInTheDocument();
    expect(screen.getByText('Campo B')).toBeInTheDocument();
    expect(screen.getByText('Valor 2')).toBeInTheDocument();
  });
});
