import { useTranslation } from 'react-i18next';

import { Icon } from '@/shared/ui/Icon';

import styles from './PillInput.module.css';

interface Props {
  readonly valor: string;
  readonly onCambio: (valor: string) => void;
  readonly placeholder?: string;
  readonly etiqueta: string;
}

export function PillInput({ valor, onCambio, placeholder, etiqueta }: Props): React.JSX.Element {
  const { t } = useTranslation('common');
  return (
    <div className={styles.contenedor!}>
      <Icon nombre="buscar" tamano={20} className={styles.icono!} />
      <input
        type="search"
        className={styles.entrada!}
        value={valor}
        placeholder={placeholder ?? etiqueta}
        aria-label={etiqueta}
        onChange={(evento) => onCambio(evento.target.value)}
      />
      {valor ? (
        <button
          type="button"
          className={styles.limpiar!}
          onClick={() => onCambio('')}
          aria-label={t('comun.limpiar', 'Limpiar busqueda')}
        >
          <Icon nombre="cerrar" tamano={20} />
        </button>
      ) : null}
    </div>
  );
}
