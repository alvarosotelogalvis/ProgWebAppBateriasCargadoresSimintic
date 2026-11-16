import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { GradientBackground } from '@/shared/ui/GradientBackground';
import { Card } from '@/shared/ui/Card';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextLink } from '@/shared/ui/TextLink';
import { Icon } from '@/shared/ui/Icon';
import { useInstallPrompt } from '@/features/instalacion/useInstallPrompt';
import { evaluarInstalacion } from '@/infrastructure/pwa/estadoInstalacion';

import styles from './InstalarPage.module.css';

export function InstalarPage(): React.JSX.Element {
  const { t } = useTranslation('instalacion');
  const navegar = useNavigate();
  const { puedeInstalar, instalar, resultado } = useInstallPrompt();
  const { plataforma, requisito } = evaluarInstalacion(window);

  // iOS: Safari muestra los pasos de «Compartir»; otro navegador debe abrir el enlace en Safari.
  const guia =
    plataforma === 'ios-safari' ? 'ios' : plataforma === 'ios-otro' ? 'iosOtro' : 'general';

  return (
    <GradientBackground variante="principal">
      <main className={styles.pagina!}>
        <div className={styles.logo!} aria-hidden="true">
          ST
        </div>
        <h1 className={styles.titulo!}>{t('titulo')}</h1>
        <p className={styles.subtitulo!}>{t('subtitulo')}</p>

        <Card fill>
          {guia === 'iosOtro' ? (
            <>
              <h2 className={styles.instruccionTitulo!}>{t('iosOtro.titulo')}</h2>
              <p className={styles.instruccionTexto!}>{t('iosOtro.texto')}</p>
            </>
          ) : (
            <>
              <h2 className={styles.instruccionTitulo!}>{t(`${guia}.titulo`)}</h2>
              <p className={styles.instruccionTexto!}>{t(`${guia}.texto`)}</p>
              <ol className={styles.pasos!}>
                <li>{t(`${guia}.paso1`)}</li>
                <li>{t(`${guia}.paso2`)}</li>
                <li>{t(`${guia}.paso3`)}</li>
              </ol>
            </>
          )}
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

        {/* En iOS no se puede usar la app sin instalarla (ES-001-02): no hay salida. */}
        {requisito === 'bloquear' ? null : (
          <TextLink onGradient onPress={() => navegar('/', { replace: true })}>
            {t('continuar')}
          </TextLink>
        )}
      </main>
    </GradientBackground>
  );
}
