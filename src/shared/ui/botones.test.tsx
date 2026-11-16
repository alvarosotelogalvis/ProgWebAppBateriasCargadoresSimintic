import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PillButton } from './PillButton';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { TextLink } from './TextLink';

/** Simula la navegación por teclado para que React Aria marque `data-focus-visible`. */
const enfocarConTeclado = (elemento: HTMLElement): void => {
  fireEvent.keyDown(document.body, { key: 'Tab' });
  act(() => elemento.focus());
};

const css = (archivo: string): string =>
  readFileSync(resolve(process.cwd(), 'src/shared/ui', archivo), 'utf-8');
const pastilla = css('PillButton.module.css');
const primario = css('PrimaryButton.module.css');
const secundario = css('SecondaryButton.module.css');
const enlace = css('TextLink.module.css');
const tokens = css('tokens.css');

const BOTONES = [
  ['PrimaryButton', (p: object) => <PrimaryButton {...p}>Guardar</PrimaryButton>],
  ['SecondaryButton', (p: object) => <SecondaryButton {...p}>Guardar</SecondaryButton>],
  ['PillButton', (p: object) => <PillButton {...p}>Guardar</PillButton>],
] as const;

describe.each(BOTONES)('%s', (_nombre, pintar) => {
  it('es un botón con nombre accesible y dispara onPress', () => {
    const alPresionar = vi.fn();
    render(pintar({ onPress: alPresionar }));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(alPresionar).toHaveBeenCalledTimes(1);
  });

  it('muestra el foco visible solo al navegar con teclado', () => {
    render(pintar({}));
    const boton = screen.getByRole('button', { name: 'Guardar' });
    expect(boton).not.toHaveAttribute('data-focus-visible');

    enfocarConTeclado(boton);

    expect(boton).toHaveAttribute('data-focus-visible', 'true');
  });

  it('deshabilitado no responde y queda marcado como tal', () => {
    const alPresionar = vi.fn();
    render(pintar({ isDisabled: true, onPress: alPresionar }));
    const boton = screen.getByRole('button', { name: 'Guardar' });

    fireEvent.click(boton);

    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('data-disabled', 'true');
    expect(alPresionar).not.toHaveBeenCalled();
  });
});

describe('variantes', () => {
  it('PrimaryButton aplica «small» y «onGradient»', () => {
    render(
      <PrimaryButton size="small" onGradient>
        Ir
      </PrimaryButton>
    );
    const clases = screen.getByRole('button', { name: 'Ir' }).className;
    expect(clases).toMatch(/small/);
    expect(clases).toMatch(/onGradient|on-gradient/);
  });

  it('SecondaryButton aplica «onGradient»', () => {
    render(<SecondaryButton onGradient>Ir</SecondaryButton>);
    expect(screen.getByRole('button', { name: 'Ir' }).className).toMatch(/onGradient|on-gradient/);
  });

  it('PillButton refleja «seleccionado» en la clase', () => {
    render(<PillButton seleccionado>Todos</PillButton>);
    expect(screen.getByRole('button', { name: 'Todos' }).className).toMatch(/seleccionado/);
  });
});

describe('TextLink', () => {
  it('es un enlace con su destino y nombre accesible', () => {
    render(<TextLink href="/ayuda">Ayuda</TextLink>);

    const link = screen.getByRole('link', { name: 'Ayuda' });
    expect(link).toHaveAttribute('href', '/ayuda');
  });

  it('muestra el foco visible con teclado', () => {
    render(<TextLink href="/ayuda">Ayuda</TextLink>);
    const link = screen.getByRole('link', { name: 'Ayuda' });

    enfocarConTeclado(link);

    expect(link).toHaveAttribute('data-focus-visible', 'true');
  });

  it('deshabilitado se marca con aria-disabled', () => {
    render(
      <TextLink href="/ayuda" isDisabled>
        Ayuda
      </TextLink>
    );
    expect(screen.getByText('Ayuda')).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('área táctil ≥ 44 px (RNF-08, docs/10 §2)', () => {
  const rem = (token: string): number =>
    Number(new RegExp(`${token}:\\s*([\\d.]+)rem`).exec(tokens)?.[1]);

  it('los tokens de control normal y de objetivo táctil son de 44 px (2.75 rem)', () => {
    expect(rem('--control-alto')).toBeGreaterThanOrEqual(2.75);
    expect(rem('--objetivo-tactil')).toBeGreaterThanOrEqual(2.75);
  });

  it('los botones normales y el enlace usan esos tokens', () => {
    expect(primario).toMatch(/\.boton\s*\{[^}]*min-height:\s*var\(--control-alto\)/);
    expect(secundario).toMatch(/\.boton\s*\{[^}]*min-height:\s*var\(--control-alto\)/);
    expect(enlace).toMatch(/min-height:\s*var\(--objetivo-tactil\)/);
  });

  it('los compactos (36 px visuales) amplían su área táctil con un ::before invisible', () => {
    expect(primario).toMatch(/\.small::before/);
    expect(pastilla).toMatch(/\.pastilla::before/);
    expect(primario).toMatch(/--objetivo-tactil/);
    expect(pastilla).toMatch(/--objetivo-tactil/);
  });
});
