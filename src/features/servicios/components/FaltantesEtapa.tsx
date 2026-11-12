import { useTranslation } from 'react-i18next';

import { Banner } from '@/shared/ui/Banner';
import styles from './FaltantesEtapa.module.css';

interface Props {
  readonly faltantes: readonly string[];
  readonly error?: string | undefined;
}

/** Lista de lo que falta para completar la etapa, o el error general. */
export function FaltantesEtapa({ faltantes, error }: Props): React.JSX.Element | null {
  const { t } = useTranslation('etapas');
  if (faltantes.length === 0 && !error) return null;

  return (
    <Banner tipo="peligro">
      {faltantes.length > 0 ? (
        <>
          {t('faltantes')}
          <ul className={styles.lista!}>
            {faltantes.map((faltante) => (
              <li key={faltante}>{faltante}</li>
            ))}
          </ul>
        </>
      ) : (
        error
      )}
    </Banner>
  );
}
