import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { obtenerEnv } from '@/shared/env';

import styles from './AcercaPage.module.css';

export function AcercaPage(): React.JSX.Element {
  const { t } = useTranslation('acerca');
  const env = obtenerEnv();
  const ambiente = env.ok ? env.env.VITE_APP_ENV.toUpperCase() : 'DESCONOCIDO';

  return (
    <div>
      <Card fill>
        <h2 className="titulo-seccion">{t('titulo')}</h2>
        <dl className={styles.datos!}>
          <div className={styles.fila!}>
            <dt>{t('version')}</dt>
            <dd className="tabular-nums">{__APP_VERSION__}</dd>
          </div>
          <div className={styles.fila!}>
            <dt>{t('build')}</dt>
            <dd className="tabular-nums">{__GIT_COMMIT__}</dd>
          </div>
          <div className={styles.fila!}>
            <dt>{t('fechaBuild')}</dt>
            <dd className="tabular-nums">{new Date(__BUILD_DATE__).toLocaleString('es-CO')}</dd>
          </div>
          <div className={styles.fila!}>
            <dt>{t('ambiente')}</dt>
            <dd>{ambiente}</dd>
          </div>
        </dl>

        <h3 className={styles.subtitulo!}>{t('novedades')}</h3>
        <pre className={styles.changelog!}>{t('sinNovedades')}</pre>

        <h3 className={styles.subtitulo!}>{t('licencia')}</h3>
        <p className={styles.texto!}>{t('licenciaTexto')}</p>

        <h3 className={styles.subtitulo!}>{t('privacidad')}</h3>
        <p className={styles.texto!}>{t('privacidadTexto')}</p>
      </Card>
    </div>
  );
}
