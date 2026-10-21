import { Icon } from '@/shared/ui/Icon';
import { useOnline } from '@/shared/hooks/useOnline';

import styles from './IndicadorConexion.module.css';

interface Props {
  readonly etiquetaEnLinea: string;
  readonly etiquetaSinConexion: string;
}

export function IndicadorConexion({
  etiquetaEnLinea,
  etiquetaSinConexion,
}: Props): React.JSX.Element {
  const enLinea = useOnline();

  return (
    <span
      className={`${styles.indicador!} ${enLinea ? styles['en-linea']! : styles['sin-conexion']!}`}
      role="status"
      aria-live="polite"
    >
      <Icon nombre={enLinea ? 'wifi' : 'wifiOff'} tamano={20} />
      <span className={styles.texto!}>{enLinea ? etiquetaEnLinea : etiquetaSinConexion}</span>
    </span>
  );
}
