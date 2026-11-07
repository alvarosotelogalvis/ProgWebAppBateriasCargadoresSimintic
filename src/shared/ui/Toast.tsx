import { useTranslation } from 'react-i18next';
import { useUiStore } from '@/shared/stores/uiStore';

import styles from './Toast.module.css';

export function Toast(): React.JSX.Element {
  const { t } = useTranslation('common');
  const toasts = useUiStore((estado) => estado.toasts);
  const quitar = useUiStore((estado) => estado.quitarToast);

  if (toasts.length === 0) {
    return <></>;
  }

  return (
    <div className={styles.region!} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast!} ${styles[toast.tipo]}`}>
          <span className={styles.mensaje!}>{toast.mensaje}</span>
          <button
            type="button"
            className={styles.cerrar!}
            onClick={() => quitar(toast.id)}
            aria-label={t('comun.cerrarAviso')}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
