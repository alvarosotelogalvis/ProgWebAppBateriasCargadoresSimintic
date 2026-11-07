import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import styles from './PantallaSinPermiso.module.css';

export function PantallaSinPermiso(): React.JSX.Element {
  const { t } = useTranslation('common');
  return (
    <div role="alert" className={styles.pantalla!}>
      <h1 className={styles.titulo!}>{t('app.sinPermiso.titulo')}</h1>
      <p className={styles.descripcion!}>{t('app.sinPermiso.descripcion')}</p>
      <Link to="/" className={styles.boton!}>
        {t('app.sinPermiso.volver')}
      </Link>
    </div>
  );
}
