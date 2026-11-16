import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar } from './Avatar';
import { DecoCircle } from './DecoCircle';
import { GradientBackground } from './GradientBackground';
import { iniciales } from './iniciales';

describe('iniciales', () => {
  it.each([
    ['Ana María Pérez', 2, 'AM'],
    ['Ana María Pérez', 1, 'A'],
    ['  juan   ', 2, 'J'],
    ['', 2, '?'],
    ['   ', 1, '?'],
  ] as const)('«%s» con %s letra(s) → %s', (nombre, letras, esperado) => {
    expect(iniciales(nombre, letras)).toBe(esperado);
  });
});

describe('Avatar', () => {
  it('muestra las iniciales y es decorativo (aria-hidden)', () => {
    const { container } = render(<Avatar nombre="Ana María" letras={2} />);

    const avatar = container.firstElementChild as HTMLElement;
    expect(avatar).toHaveTextContent('AM');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  it('aplica el tamaño y la variante pedidos', () => {
    const { container } = render(<Avatar nombre="Ana" tamano="grande" variante="solido" />);

    const clases = (container.firstElementChild as HTMLElement).className;
    expect(clases).toMatch(/grande/);
    expect(clases).toMatch(/solido/);
  });

  it('sin nombre muestra «?»', () => {
    const { container } = render(<Avatar nombre="" />);

    expect(container.firstElementChild).toHaveTextContent('?');
  });
});

describe('DecoCircle', () => {
  it.each(['arribaDerecha', 'abajoIzquierda', 'centroDerecha'] as const)(
    '«%s» es decorativo: oculto a lectores de pantalla',
    (posicion) => {
      const { container } = render(<DecoCircle posicion={posicion} />);

      const circulo = container.firstElementChild as HTMLElement;
      expect(circulo).toHaveAttribute('aria-hidden', 'true');
      expect(circulo.className).toMatch(
        new RegExp(
          posicion.replace(/[A-Z]/g, (l) => `-?${l}`),
          'i'
        )
      );
    }
  );

  it('no usa colores ni radios literales: vienen de tokens (revisado por Stylelint)', () => {
    const { container } = render(<DecoCircle posicion="arribaDerecha" />);

    expect(container.firstElementChild).not.toHaveAttribute('style');
  });
});

describe('GradientBackground', () => {
  it.each(['principal', 'suave'] as const)(
    'variante %s pinta 3 círculos decorativos y el contenido',
    (variante) => {
      const { container, getByText } = render(
        <GradientBackground variante={variante}>
          <p>Contenido</p>
        </GradientBackground>
      );

      expect(getByText('Contenido')).toBeInTheDocument();
      expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
      expect(container.firstElementChild?.className).toMatch(new RegExp(variante));
    }
  );
});
