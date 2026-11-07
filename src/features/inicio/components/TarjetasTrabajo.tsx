import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useRoles } from '@/shared/hooks/useRoles';
import { useContainer } from '@/app/containerContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { tarjetasPorRol } from '@/domain/tarjetasInicio';
import { filtrarServicios } from '@/application/servicios/buscarServicios';
import styles from './TarjetasTrabajo.module.css';

export default function TarjetasTrabajo() {
  const { t } = useTranslation(['etapas', 'tareas']);
  const roles = useRoles();
  const container = useContainer();

  const tarjetas = tarjetasPorRol(roles);

  const contadores = useLiveQuery(async () => {
    const todoServicios = await container.db.servicios.toArray();
    const resultado: Record<string, number> = {};
    for (const tarjeta of tarjetas) {
      resultado[tarjeta.clave] = filtrarServicios(todoServicios, tarjeta.filtro).length;
    }
    return resultado;
  }, [container.db, tarjetas.length]);

  return (
    <div className={styles['tarjetas-trabajo']}>
      <h2>{t('tareas.misTrabajo')}</h2>
      <div className={styles.grid}>
        {tarjetas.map((tarjeta) => (
          <Link
            key={tarjeta.clave}
            to={`/servicios?filtro=${tarjeta.clave}`}
            className={styles.tarjeta}
          >
            <div className={styles.contenido}>
              <p className={styles.titulo}>{t(tarjeta.labelI18n)}</p>
              <div className={styles.badge}>{contadores?.[tarjeta.clave] ?? 0}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
