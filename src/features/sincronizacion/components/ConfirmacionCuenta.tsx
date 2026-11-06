import { useTranslation } from 'react-i18next';

import type { ResumenPendientes } from '@/application/sync/resumenPendientes';
import type { CuentaUsuario } from '@/domain/servicio';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Icon } from '@/shared/ui/Icon';
import { ListRow } from '@/shared/ui/ListRow';
import { PillButton } from '@/shared/ui/PillButton';
import { TextLink } from '@/shared/ui/TextLink';

import styles from './ConfirmacionCuenta.module.css';

interface Props {
  readonly cuenta: CuentaUsuario | null;
  readonly resumen: ResumenPendientes | null;
  readonly enLinea: boolean;
  readonly sincronizando: boolean;
  /** Bloquea la confirmación (p. ej. versión obsoleta, ES-005-24). */
  readonly bloqueado?: boolean;
  readonly onConfirmar: () => void;
  readonly onOtraCuenta: () => void;
}

function formatearTamano(bytes: number): string {
  const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
  const kilobytes = bytes / 1024;
  const megabytes = kilobytes / 1024;

  if (megabytes >= 1024) return `${formato.format(megabytes / 1024)} GB`;
  if (megabytes >= 1) return `${formato.format(megabytes)} MB`;
  // Fotos pequeñas: "0 MB" confundía; se muestra en KB (mínimo 0,1 KB si hay bytes).
  return `${formato.format(bytes > 0 ? Math.max(kilobytes, 0.1) : 0)} KB`;
}

export function ConfirmacionCuenta({
  cuenta,
  resumen,
  enLinea,
  sincronizando,
  bloqueado = false,
  onConfirmar,
  onOtraCuenta,
}: Props): React.JSX.Element {
  const { t } = useTranslation('sync');
  const hayPendientes = resumen ? resumen.servicios > 0 || resumen.archivos > 0 : true;
  const deshabilitado =
    bloqueado || !enLinea || sincronizando || (resumen !== null && !hayPendientes);

  return (
    <Card fill className={styles.tarjeta!}>
      <h2 className={styles.titulo!}>{t('confirmarCuenta.titulo')}</h2>
      <p className={styles.descripcion!}>{t('confirmarCuenta.descripcion')}</p>

      {enLinea ? null : <Banner tipo="info">{t('sinConexion')}</Banner>}

      <p className={styles.resumen!} aria-live="polite" data-testid="resumen-pendientes">
        {resumen === null
          ? t('confirmarCuenta.cargando')
          : hayPendientes
            ? t('confirmarCuenta.resumen', {
                servicios: resumen.servicios,
                archivos: resumen.archivos,
                tamano: formatearTamano(resumen.bytes),
              })
            : t('confirmarCuenta.sinPendientes')}
      </p>

      <div className={styles.destinos!}>
        <Chip tono="account">{t('confirmarCuenta.esteDispositivo')}</Chip>
        <Icon nombre="avanzar" tamano={20} />
        <Chip tono="account">{t('confirmarCuenta.sharepoint')}</Chip>
      </div>

      <div className={styles.cuenta!}>
        <span className={styles.avatar!} aria-hidden="true">
          {(cuenta?.nombre ?? '?').slice(0, 1).toUpperCase()}
        </span>
        <div className={styles.datosCuenta!}>
          <span className={styles.nombre!}>{cuenta?.nombre ?? ''}</span>
          <span className={styles.correo!}>{cuenta?.correo ?? ''}</span>
        </div>
      </div>

      <PillButton outlined isDisabled={deshabilitado} onPress={onConfirmar}>
        {sincronizando
          ? t('confirmarCuenta.confirmando')
          : t('confirmarCuenta.confirmarComo', { correo: cuenta?.correo ?? '' })}
      </PillButton>

      <TextLink onPress={onOtraCuenta} className={styles.enlace!}>
        {t('confirmarCuenta.usarOtraCuenta')}
      </TextLink>

      {resumen && resumen.porServicio.length > 0 ? (
        <section className={styles.detalle!} aria-label={t('confirmarCuenta.subiran')}>
          <h3 className={styles.subtitulo!}>{t('confirmarCuenta.subiran')}</h3>
          <ul className={styles.lista!}>
            {resumen.porServicio.map((servicio) => (
              <li key={servicio.servicioId}>
                <ListRow
                  icono="servicios"
                  etiqueta={servicio.codigo}
                  descripcion={
                    servicio.archivos > 0
                      ? t('confirmarCuenta.archivos', { count: servicio.archivos })
                      : t('confirmarCuenta.sinArchivos')
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Card>
  );
}
