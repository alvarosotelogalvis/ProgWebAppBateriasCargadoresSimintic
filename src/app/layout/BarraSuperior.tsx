import { useTranslation } from 'react-i18next';

import { IndicadorConexion } from '@/shared/ui/IndicadorConexion';
import { ContadorPendientes } from '@/shared/ui/ContadorPendientes';

import { FranjaAmbiente } from '@/app/layout/FranjaAmbiente';

import styles from './BarraSuperior.module.css';

export function BarraSuperior(): React.JSX.Element {
  const { t } = useTranslation(['comun', 'navegacion']);

  return (
    <header className={styles.barra!}>
      <FranjaAmbiente />
      <div className={styles.fila!}>
        <h1 className={styles.titulo!}>{t('navegacion:inicio')}</h1>
        <div className={styles.indicadores!}>
          <IndicadorConexion
            etiquetaEnLinea={t('conexion:enLinea', 'En linea')}
            etiquetaSinConexion={t('conexion:sinConexion', 'Sin conexion')}
          />
          <ContadorPendientes etiqueta={t('navegacion:pendientes', 'pendientes')} />
        </div>
      </div>
    </header>
  );
}
