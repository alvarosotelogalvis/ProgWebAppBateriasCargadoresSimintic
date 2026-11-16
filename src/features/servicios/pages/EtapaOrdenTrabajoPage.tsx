import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { useServicio } from '@/infrastructure/db/hooks';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { TextField } from '@/shared/ui/TextField';
import CampoMoneda from '../components/CampoMoneda';
import { FaltantesEtapa } from '../components/FaltantesEtapa';
import { useAutoguardado } from '../hooks/useAutoguardado';
import { useCompletarEtapa } from '../hooks/useCompletarEtapa';
import styles from './EtapaPage.module.css';

interface CambiosOT {
  otDetalle?: string;
  otCostoReparacion?: number;
}

const formatoCOP = (valor: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);

/** Orden de trabajo interna (HU-007-4): solo con la cotización aprobada. */
export function EtapaOrdenTrabajoPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation(['etapas', 'servicios']);
  const navigate = useNavigate();
  const container = useContainer();
  const servicio = useServicio(id);
  const roles = useSesionStore((estado) => estado.roles);

  const [cambios, setCambios] = useState<CambiosOT>({});
  const { completar, completando, faltantes, errorGeneral } = useCompletarEtapa({
    servicioId: id,
    roles,
  });
  const {
    estado: estadoGuardado,
    programar,
    cancelar,
  } = useAutoguardado((parciales: CambiosOT) =>
    container.casosDeUso.actualizarCampos(id, parciales, roles)
  );

  if (!servicio) return <p role="status">{t('servicios:detalle.noEncontrado')}</p>;

  const detalle = cambios.otDetalle ?? servicio.otDetalle ?? '';
  const costo = cambios.otCostoReparacion ?? servicio.otCostoReparacion ?? 0;
  const aprobada = servicio.cotizacionEstado === 'APROBADA';
  const editando = servicio.estado === 'COTIZADO' && aprobada;
  const sinOrden = servicio.estado === 'COTIZADO' && !aprobada;

  const actualizar = (parciales: CambiosOT): void => {
    const siguientes = { ...cambios, ...parciales };
    setCambios(siguientes);
    programar(siguientes);
  };

  const textoGuardado =
    estadoGuardado === 'guardando'
      ? t('etapas:guardando')
      : estadoGuardado === 'guardado'
        ? t('etapas:guardado')
        : '';

  return (
    <form
      className={styles.formulario!}
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!editando) return;
        cancelar();
        void completar('generarOT', { otDetalle: detalle, otCostoReparacion: costo });
      }}
    >
      <header>
        <h1>{t('etapas:ordenTrabajo.titulo')}</h1>
        <p>{t('etapas:ordenTrabajo.subtitulo')}</p>
      </header>

      {sinOrden ? (
        <Banner tipo="info">
          {servicio.cotizacionEstado === 'RECHAZADA'
            ? t('etapas:ordenTrabajo.soloAprobada')
            : t('etapas:ordenTrabajo.esperandoRespuesta')}
        </Banner>
      ) : (
        <Card fill>
          <div className={styles.campos!}>
            {editando ? (
              <>
                <TextField
                  id="detalle"
                  etiqueta={t('etapas:ordenTrabajo.detalle')}
                  ayuda={t('etapas:ordenTrabajo.detalleAyuda')}
                  multilinea
                  value={detalle}
                  onChange={(texto) => actualizar({ otDetalle: texto })}
                />
                <CampoMoneda
                  label={t('etapas:ordenTrabajo.costo')}
                  valor={costo}
                  requerido
                  onChange={(monto) => actualizar({ otCostoReparacion: monto })}
                  helpText={t('etapas:ordenTrabajo.costoAyuda')}
                />
              </>
            ) : (
              <dl>
                <dt>{t('etapas:ordenTrabajo.detalle')}</dt>
                <dd>{servicio.otDetalle ?? '—'}</dd>
                <dt>{t('etapas:ordenTrabajo.costo')}</dt>
                <dd>{formatoCOP(servicio.otCostoReparacion ?? 0)}</dd>
              </dl>
            )}
          </div>
        </Card>
      )}

      <FaltantesEtapa faltantes={faltantes} error={errorGeneral} />

      <div className={styles.pie!}>
        <span className={styles.estado!} role="status">
          {textoGuardado}
        </span>
        <div className={styles.acciones!}>
          <SecondaryButton onPress={() => navigate(`/servicios/${servicio.id}`)}>
            {editando ? t('etapas:cancelar') : t('servicios:detalle.volver')}
          </SecondaryButton>
          {editando ? (
            <PrimaryButton type="submit" isDisabled={completando}>
              {t('etapas:ordenTrabajo.completar')}
            </PrimaryButton>
          ) : null}
        </div>
      </div>
    </form>
  );
}
