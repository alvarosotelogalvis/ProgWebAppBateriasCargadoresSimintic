import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Chip } from './Chip';

vi.mock('@/shared/ui/Icon', () => ({
  Icon: () => <svg aria-hidden="true" />,
}));

describe('Chip', () => {
  it('muestra el texto y el tono solicitado', () => {
    render(<Chip tono="account">ESTE DISPOSITIVO</Chip>);

    const chip = screen.getByText('ESTE DISPOSITIVO');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('data-tono', 'account');
  });

  it('marca el icono como decorativo', () => {
    const { container } = render(
      <Chip icono="avanzar" tono="account">
        SHAREPOINT
      </Chip>
    );

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
