import { useTranslation } from 'react-i18next';

import type { CuentaUsuario } from '@/domain/servicio';
import { Banner } from '@/shared/ui/Banner';
import { GradientBackground } from '@/shared/ui/GradientBackground';
import { Icon } from '@/shared/ui/Icon';
import { PillButton } from '@/shared/ui/PillButton';

import styles from '../configuracionInicial.module.css';

interface Props {
  readonly cuenta: CuentaUsuario | null;
  readonly cargando: boolean;
  readonly error: boolean;
  readonly onIniciar: () => void;
  readonly onContinuar: () => void;
}

export function IniciarSesion({
  cuenta,
  cargando,
  error,
  onIniciar,
  onContinuar,
}: Props): React.JSX.Element {
  const { t } = useTranslation('configuracion');

  return (
    <GradientBackground>
      <main className={styles.pantalla!}>
        <div className={styles.hero!}>
          <span className={styles.logo!} aria-hidden="true">
            ST
          </span>
          <h1 className={styles.titulo!}>{t('login.titulo')}</h1>
          <p className={styles.descripcion!}>{t('login.descripcion')}</p>

          {error ? (
            <Banner tipo="peligro">
              <span role="alert">{t('login.error')}</span>
            </Banner>
          ) : null}

          {cuenta ? (
            <div className={styles.cuenta!}>
              <span className={styles.etiquetaTarea!}>{t('login.cuenta')}</span>
              <span>{cuenta.nombre}</span>
              <span className={styles.detalleTarea!}>{cuenta.correo}</span>
              <span className={styles.detalleTarea!}>
                {t('login.roles')}: {cuenta.roles.join(', ')}
              </span>
            </div>
          ) : (
            <p className={styles.detalleTarea!}>{t('login.sinCuenta')}</p>
          )}

          <PillButton onPress={cuenta ? onContinuar : onIniciar} isDisabled={cargando}>
            <Icon nombre="persona" tamano={20} />
            {cuenta ? t('login.continuar') : t('login.boton')}
          </PillButton>
        </div>
      </main>
    </GradientBackground>
  );
}
