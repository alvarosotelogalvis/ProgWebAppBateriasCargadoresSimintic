import { Link } from 'react-router-dom';

import { useUiStore } from '@/shared/stores/uiStore';

import styles from './ContadorPendientes.module.css';

interface Props {
  readonly etiqueta: string;
}

export function ContadorPendientes({ etiqueta }: Props): React.JSX.Element {
  const pendientes = useUiStore((estado) => estado.pendientes);

  if (pendientes <= 0) {
    return <></>;
  }

  return (
    <Link to="/sincronizar" className={styles.contador!}>
      <span className={styles.cifra!}>{pendientes}</span>
      <span className={styles.texto!}>{etiqueta}</span>
    </Link>
  );
}
