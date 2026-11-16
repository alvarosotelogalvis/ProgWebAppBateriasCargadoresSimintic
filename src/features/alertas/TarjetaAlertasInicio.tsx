import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/containerContext';
import { filtrarAlertasActivas, DEFAULT_UMBRALES } from '@/domain/alertas';
import styles from './TarjetaAlertasInicio.module.css';

export function TarjetaAlertasInicio() {
  const { t } = useTranslation('alertas');
  const navigate = useNavigate();
  const container = useContainer();

  const servicios = useLiveQuery(
    () => container.db.servicios.where('estado').anyOf(['ENTREGADO', 'FACTURADO']).toArray(),
    [container.db]
  );

  const alertas = servicios ? filtrarAlertasActivas(servicios, DEFAULT_UMBRALES) : [];

  const vencidas = alertas.filter((a) => a.nivel === 'vencida').length;
  const dias30 = alertas.filter((a) => a.nivel === '30').length;
  const total = alertas.length;

  const handleClick = () => {
    navigate('/alertas');
  };

  if (total === 0) {
    return (
      <button className={styles.tarjeta} onClick={handleClick}>
        <div className={styles.titulo}>{t('titulo')}</div>
        <div className={styles.contenido}>{t('sinAlertas')}</div>
      </button>
    );
  }

  return (
    <button className={styles.tarjeta} onClick={handleClick}>
      <div className={styles.titulo}>{t('titulo')}</div>
      <div className={styles.contenido}>{t('resumen', { vencidas, dias30 })}</div>
      <div className={styles.badge}>{total}</div>
    </button>
  );
}
