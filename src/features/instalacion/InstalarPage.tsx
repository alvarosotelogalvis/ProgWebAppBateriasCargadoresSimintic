import { useTranslation } from 'react-i18next';

import { GradientBackground } from '@/shared/ui/GradientBackground';
import { Card } from '@/shared/ui/Card';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextLink } from '@/shared/ui/TextLink';
import { Icon } from '@/shared/ui/Icon';
import { useInstallPrompt } from '@/features/instalacion/useInstallPrompt';

import styles from './InstalarPage.module.css';

export function InstalarPage(): React.JSX.Element {
  const { t } = useTranslation('instalacion');
  const { puedeInstalar, instalar, resultado } = useInstallPrompt();

  return (
    <GradientBackground variante="principal">
      <main className={styles.pagina!}>
        <div className={styles.logo!} aria-hidden="true">
          ST
        </div>
        <h1 className={styles.titulo!}>{t('titulo')}</h1>
        <p className={styles.subtitulo!}>{t('subtitulo')}</p>

        <Card fill>
          <h2 className={styles['instruccion-titulo']!}>{t('instrucciones.titulo')}</h2>
          <p className={styles['instruccion-texto']!}>{t('instrucciones.texto')}</p>
          <ol className={styles.pasos!}>
            <li>{t('instrucciones.paso1')}</li>
            <li>{t('instrucciones.paso2')}</li>
            <li>{t('instrucciones.paso3')}</li>
          </ol>
        </Card>

        {puedeInstalar ? (
          <PrimaryButton onPress={() => void instalar()}>
            <Icon nombre="descargar" tamano={20} />
            {t('botonInstalar')}
          </PrimaryButton>
        ) : null}

        {resultado === 'dismissed' ? (
          <p className={styles.nota!} role="status">
            {t('descartado')}
          </p>
        ) : null}

        <TextLink onGradient onPress={() => history.back()}>
          {t('continuar')}
        </TextLink>
      </main>
    </GradientBackground>
  );
}
