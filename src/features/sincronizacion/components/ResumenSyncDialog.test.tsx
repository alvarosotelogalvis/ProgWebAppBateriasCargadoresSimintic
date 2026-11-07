import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { ResumenSyncDialog } from './ResumenSyncDialog';

vi.mock('@/shared/hooks/useBreakpoint', () => ({ useBreakpoint: () => 'compacto' }));

describe('ResumenSyncDialog', () => {
  it('muestra subidos, con error y en conflicto al terminar (ES-005-19)', () => {
    const onCerrar = vi.fn();
    render(
      <ResumenSyncDialog
        resumen={{ subidos: 3, archivos: 11, errores: 1, conflictos: 2, resultado: 'Parcial' }}
        onCerrar={onCerrar}
      />
    );

    expect(screen.getByText('Sincronización parcial')).toBeInTheDocument();
    expect(screen.getByText('Registros subidos').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Archivos subidos').nextSibling).toHaveTextContent('11');
    expect(screen.getByText('Con error').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('En conflicto').nextSibling).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: 'CERRAR' }));
    expect(onCerrar).toHaveBeenCalled();
  });

  it('informa cuando otra ventana ya está sincronizando (ES-005-20)', () => {
    render(
      <ResumenSyncDialog
        resumen={{
          subidos: 0,
          archivos: 0,
          errores: 0,
          conflictos: 0,
          resultado: 'Error',
          ocupado: true,
        }}
        onCerrar={vi.fn()}
      />
    );
    expect(screen.getByText(/Ya hay una sincronización en curso/)).toBeInTheDocument();
    expect(screen.queryByText('Registros subidos')).not.toBeInTheDocument();
  });

  it('no se muestra sin resumen', () => {
    render(<ResumenSyncDialog resumen={null} onCerrar={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
