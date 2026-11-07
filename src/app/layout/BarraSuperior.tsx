import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { IndicadorConexion } from '@/shared/ui/IndicadorConexion';
import { ContadorPendientes } from '@/shared/ui/ContadorPendientes';

import { FranjaAmbiente } from '@/app/layout/FranjaAmbiente';

import styles from './BarraSuperior.module.css';

/** Primer segmento de la ruta → clave de `navegacion.json` para el título de la barra. */
const TITULOS: Readonly<Record<string, string>> = {
  '': 'inicio',
  servicios: 'servicios',
  sincronizacion: 'sincronizacion',
  sincronizar: 'sincronizacion',
  mas: 'mas',
  cuenta: 'cuenta',
  ajustes: 'ajustes',
  ayuda: 'ayuda',
  acerca: 'acerca',
  alertas: 'alertas',
  tecnico: 'tecnico',
};

export function BarraSuperior(): React.JSX.Element {
  const { t } = useTranslation(['navegacion', 'conexion']);
  const { pathname } = useLocation();
  const seccion = pathname.split('/')[1] ?? '';
  const clave = TITULOS[seccion] ?? 'inicio';

  return (
    <header className={styles.barra!}>
      <FranjaAmbiente />
      <div className={styles.fila!}>
        <h1 className={styles.titulo!}>{t(`navegacion:${clave}`)}</h1>
        <div className={styles.indicadores!}>
          <IndicadorConexion
            etiquetaEnLinea={t('conexion:enLinea')}
            etiquetaSinConexion={t('conexion:sinConexion')}
          />
          <ContadorPendientes etiqueta={t('conexion:pendientes')} />
        </div>
      </div>
    </header>
  );
}
