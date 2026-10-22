/* eslint-disable no-restricted-syntax */
import { obtenerEnv } from '@/shared/env';

import styles from './FranjaAmbiente.module.css';

/**
 * Franja "DEV" visible en el ambiente de desarrollo (ES-001-17, ADR-0020).
 */
export function FranjaAmbiente(): React.JSX.Element | null {
  const env = obtenerEnv();
  if (!env.ok || env.env.VITE_APP_ENV !== 'dev') {
    return null;
  }

  return (
    <div className={styles.franja!} role="note">
      DEV
    </div>
  );
}
