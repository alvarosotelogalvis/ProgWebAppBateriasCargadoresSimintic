import type { Servicio } from '@/domain/servicio';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContainer } from '@/app/containerContext';
import { useTranslation } from 'react-i18next';
import PhotoCarousel from '@/shared/ui/PhotoCarousel';
import styles from './CabeceraServicio.module.css';

export interface CabeceraServicioProps {
  servicio: Servicio;
  breakpoint?: 'compact' | 'medium' | 'expanded';
}

export default function CabeceraServicio({
  servicio,
  breakpoint = 'compact',
}: CabeceraServicioProps) {
  const { t } = useTranslation(['servicios', 'etapas']);
  const container = useContainer();

  // Obtener fotos de ingreso y salida
  const adjuntos = useLiveQuery(async () => {
    return container.db.adjuntos
      .where('servicioId')
      .equals(servicio.id)
      .filter((a) => a.tipo === 'FOTO_INGRESO' || a.tipo === 'FOTO_SALIDA')
      .toArray();
  }, [servicio.id, container.db]);

  // Convertir Adjuntos a Fotos
  const fotos =
    adjuntos
      ?.filter((a) => a.blob)
      .map((a) => ({
        url: URL.createObjectURL(a.blob!),
        alt: `${a.tipo} ${new Date(a.creadoEn).toLocaleDateString()}`,
      })) ?? [];

  const estadoLabel = t(`servicios:estado.${servicio.estado}`);

  return (
    <div className={`${styles.cabecera} ${styles[breakpoint]}`}>
      {/* Carrusel de fotos */}
      {fotos.length > 0 && (
        <div className={styles.fotos}>
          <PhotoCarousel fotos={fotos} breakpoint={breakpoint} />
        </div>
      )}

      {/* Información del servicio */}
      <div className={styles.info}>
        <div className={styles.codigo}>{servicio.codigo}</div>

        <div className={styles.estado}>
          <span className={styles.badge}>{estadoLabel}</span>
        </div>

        {/* Resumen rápido */}
        <div className={styles.resumen}>
          {servicio.clienteNombre && (
            <div className={styles.campo}>
              <span className={styles.label}>{t('servicios:detalle.cliente')}</span>
              <span className={styles.valor}>{servicio.clienteNombre}</span>
            </div>
          )}

          {servicio.serie && (
            <div className={styles.campo}>
              <span className={styles.label}>{t('servicios:recepcion.serie')}</span>
              <span className={styles.valor}>{servicio.serie}</span>
            </div>
          )}

          {servicio.fechaRecepcion && (
            <div className={styles.campo}>
              <span className={styles.label}>{t('servicios:recepcion.fechaRecepcion')}</span>
              <span className={styles.valor}>{servicio.fechaRecepcion}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
