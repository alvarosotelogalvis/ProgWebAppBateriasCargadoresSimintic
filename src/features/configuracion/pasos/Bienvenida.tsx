import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { GradientBackground } from '@/shared/ui/GradientBackground';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextLink } from '@/shared/ui/TextLink';

import styles from '../configuracionInicial.module.css';

interface Props {
  readonly onEmpezar: () => void;
}

export function Bienvenida({ onEmpezar }: Props): React.JSX.Element {
  const { t } = useTranslation(['configuracion', 'common']);
  const navigate = useNavigate();

  return (
    <GradientBackground>
      <main className={styles.pantalla!}>
        <div className={styles.hero!}>
          <span className={styles.logo!} aria-hidden="true">
            ST
          </span>
          <h1 className={styles.titulo!}>{t('bienvenida.titulo')}</h1>
          <p className={styles.subtitulo!}>{t('bienvenida.subtitulo')}</p>
          <p className={styles.descripcion!}>{t('bienvenida.descripcion')}</p>
          <PrimaryButton onPress={onEmpezar}>{t('bienvenida.empezar')}</PrimaryButton>
        </div>
        <footer className={styles.enlaces!}>
          <TextLink onGradient onPress={() => navigate('/instalar')}>
            {t('bienvenida.comoInstalar')}
          </TextLink>
          <TextLink onGradient onPress={() => navigate('/ayuda')}>
            {t('common:comun.ayuda', 'Ayuda')}
          </TextLink>
        </footer>
      </main>
    </GradientBackground>
  );
}
