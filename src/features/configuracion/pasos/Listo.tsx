import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';

import styles from '../configuracionInicial.module.css';

interface Props {
  readonly repetir: boolean;
  readonly onIrInicio: () => void;
  readonly onRepetir?: () => void;
}

export function Listo({ repetir, onIrInicio, onRepetir }: Props): React.JSX.Element {
  const { t } = useTranslation('configuracion');

  return (
    <main className={styles.centrado!}>
      <div className={styles.tarjeta!}>
        <Card fill>
          <header className={styles.cabecera!}>
            <h1>{t('listo.titulo')}</h1>
            <p>{repetir ? t('repetir.descripcion') : t('listo.descripcion')}</p>
          </header>
          <div className={styles.acciones!}>
            {repetir && onRepetir ? (
              <PrimaryButton onPress={onRepetir}>{t('listo.repetir')}</PrimaryButton>
            ) : null}
            <PrimaryButton onPress={onIrInicio}>{t('listo.irInicio')}</PrimaryButton>
          </div>
        </Card>
      </div>
    </main>
  );
}
