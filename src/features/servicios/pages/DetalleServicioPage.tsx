import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { useAdjuntos, useServicio } from '@/infrastructure/db/hooks';
import { BannerConflicto } from '@/features/sincronizacion/components/BannerConflicto';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LineaTiempoEtapas } from '@/shared/ui/LineaTiempoEtapas';
import { PhotoGallery } from '@/shared/ui/PhotoGallery';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { StatusBadge } from '@/shared/ui/StatusBadge';

import styles from './DetalleServicioPage.module.css';

export function DetalleServicioPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation('servicios');
  const navigate = useNavigate();
  const container = useContainer();
  const servicio = useServicio(id);
  const adjuntos = useAdjuntos(id);
  const [confirmar, setConfirmar] = useState(false);

  if (!servicio) {
    return <EmptyState titulo={t('detalle.noEncontrado')} icono="servicios" />;
  }

  const estado = servicio.estado;
  const fotos = adjuntos.filter((adjunto) => adjunto.tipo === 'FOTO_INGRESO');

  return (
    <div className={styles.pagina!}>
      <button type="button" className={styles.volver!} onClick={() => navigate('/servicios')}>
        {t('detalle.volver')}
      </button>

      {servicio.syncState === 'conflict' && <BannerConflicto servicioId={servicio.id} />}

      <Card fill>
        <div className={styles.cabecera!}>
          <h1>{servicio.codigo || t('detalle.titulo')}</h1>
          <StatusBadge estado={estado} etiqueta={t(`estado.${estado}`)} />
        </div>
        <dl className={styles.datos!}>
          <div>
            <dt>{t('recepcion.cliente')}</dt>
            <dd>{servicio.clienteNombre || '—'}</dd>
          </div>
          <div>
            <dt>{t('recepcion.serie')}</dt>
            <dd>{servicio.serie || '—'}</dd>
          </div>
          <div>
            <dt>{t('recepcion.numeroSolicitud')}</dt>
            <dd>{servicio.numeroSolicitud || '—'}</dd>
          </div>
          <div>
            <dt>{t('recepcion.marca')}</dt>
            <dd>{servicio.marca || '—'}</dd>
          </div>
          <div>
            <dt>{t('recepcion.referencia')}</dt>
            <dd>{servicio.referencia || '—'}</dd>
          </div>
          <div>
            <dt>{t('recepcion.fechaRecepcion')}</dt>
            <dd>{servicio.fechaRecepcion}</dd>
          </div>
        </dl>
        <div className={styles.timeline!}>
          <LineaTiempoEtapas estado={estado} />
        </div>
      </Card>

      <Card fill>
        <h2>{t('adjuntos:titulo')}</h2>
        {fotos.length > 0 ? <PhotoGallery adjuntos={fotos} /> : null}
      </Card>

      {servicio.estado === 'BORRADOR' ? (
        <div className={styles.acciones!}>
          <SecondaryButton onPress={() => setConfirmar(true)}>
            {t('recepcion.descartar')}
          </SecondaryButton>
          <PrimaryButton onPress={() => navigate(`/servicios/${servicio.id}/etapa/recepcion`)}>
            {t('recepcion.completar')}
          </PrimaryButton>
        </div>
      ) : (
        <p className={styles.pendiente!}>{t('detalle.sinEtapa')}</p>
      )}

      <ResponsiveDialog
        titulo={t('recepcion.descartarTitulo')}
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
      >
        <p>{t('recepcion.descartarTexto')}</p>
        <div className={styles.acciones!}>
          <SecondaryButton onPress={() => setConfirmar(false)}>
            {t('common:comun.cancelar')}
          </SecondaryButton>
          <PrimaryButton
            onPress={() => {
              void container.casosDeUso.descartarBorrador(servicio.id).then(() => {
                navigate('/servicios', { replace: true });
              });
            }}
          >
            {t('recepcion.descartarSi')}
          </PrimaryButton>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
