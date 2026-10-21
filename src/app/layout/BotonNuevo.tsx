import { useNavigate } from 'react-router-dom';

import { Icon } from '@/shared/ui/Icon';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';

import styles from './BotonNuevo.module.css';

interface Props {
  readonly etiqueta: string;
}

/**
 * FAB flotante en compacto, boton en la parte superior del riel en medio y boton
 * principal en la barra lateral en expandido (docs/10 - Seccion 4.2).
 */
export function BotonNuevo({ etiqueta }: Props): React.JSX.Element {
  const navigate = useNavigate();
  const breakpoint = useBreakpoint();

  if (breakpoint === 'expandido' || breakpoint === 'amplio') {
    return (
      <div className={styles.lateral!}>
        <PrimaryButton onPress={() => navigate('/servicios/nuevo')}>
          <Icon nombre="nuevo" tamano={20} />
          {etiqueta}
        </PrimaryButton>
      </div>
    );
  }

  if (breakpoint === 'medio') {
    return (
      <div className={styles.riel!}>
        <button
          type="button"
          className={styles.fab!}
          onClick={() => navigate('/servicios/nuevo')}
          aria-label={etiqueta}
        >
          <Icon nombre="nuevo" tamano={24} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.flotante!}>
      <button
        type="button"
        className={styles.fab!}
        onClick={() => navigate('/servicios/nuevo')}
        aria-label={etiqueta}
      >
        <Icon nombre="nuevo" tamano={28} />
      </button>
    </div>
  );
}
