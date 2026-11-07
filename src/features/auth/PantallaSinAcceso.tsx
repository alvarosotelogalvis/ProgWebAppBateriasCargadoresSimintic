import { useTranslation } from 'react-i18next';

import type { CodigoRechazoAuth } from '@/infrastructure/auth/arranque';
import { GradientBackground } from '@/shared/ui/GradientBackground';
import { Icon } from '@/shared/ui/Icon';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';

import styles from '../configuracion/configuracionInicial.module.css';

interface Props {
  readonly codigo: CodigoRechazoAuth;
  readonly onOtraCuenta: () => void;
}

export function PantallaSinAcceso({ codigo, onOtraCuenta }: Props): React.JSX.Element {
  const { t } = useTranslation('auth');

  return (
    <GradientBackground>
      <main className={styles.pantalla!}>
        <div className={styles.hero!}>
          <span className={styles.logo!}>
            <Icon nombre="seguridad" tamano={72} />
          </span>
          <h1 className={styles.titulo!}>{t('sinAcceso.titulo')}</h1>
          <p className={styles.descripcion!} role="alert">
            {codigo === 'AUTH_TENANT_INVALIDO' ? t('sinAcceso.tenant') : t('sinAcceso.sinRol')}
          </p>
          <PrimaryButton onPress={onOtraCuenta}>{t('sinAcceso.otraCuenta')}</PrimaryButton>
        </div>
      </main>
    </GradientBackground>
  );
}
