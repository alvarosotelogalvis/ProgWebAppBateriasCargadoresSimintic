import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { AdjuntosEtapa } from '@/features/adjuntos/components/AdjuntosEtapa';
import { useAdjuntos, useServicio } from '@/infrastructure/db/hooks';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { DateChip } from '@/shared/ui/DateChip';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import CampoVidaUtil from '../components/CampoVidaUtil';
import { FaltantesEtapa } from '../components/FaltantesEtapa';
import { useAutoguardado } from '../hooks/useAutoguardado';
import { useCompletarEtapa } from '../hooks/useCompletarEtapa';
import styles from './EtapaPage.module.css';

interface CambiosEntrega {
  fechaEntrega?: string;
  proyeccionVidaUtil?: string;
}

/**
 * Entrega (HU-007-5). Dos variantes: con reparación (EN_REPARACION, vida útil obligatoria)
 * y sin reparación (COTIZADO con cotización rechazada, vida útil opcional).
 */
export function EtapaEntregaPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation(['etapas', 'servicios', 'adjuntos']);
  const navigate = useNavigate();
  const container = useContainer();
  const servicio = useServicio(id);
  const adjuntos = useAdjuntos(id);
  const roles = useSesionStore((estado) => estado.roles);

  const [cambios, setCambios] = useState<CambiosEntrega>({});
  const { completar, completando, faltantes, errorGeneral } = useCompletarEtapa({
    servicioId: id,
    roles,
    etiquetaAdjunto: (tipo) =>
      tipo === 'FOTO_SALIDA' ? t('etapas:entrega.faltante_fotos') : undefined,
  });
  const {
    estado: estadoGuardado,
    programar,
    cancelar,
  } = useAutoguardado((parciales: CambiosEntrega) =>
    container.casosDeUso.actualizarCampos(id, parciales, roles)
  );

  if (!servicio) return <p role="status">{t('servicios:detalle.noEncontrado')}</p>;

  const hoy = new Date().toLocaleDateString('en-CA');
  const conReparacion = servicio.estado === 'EN_REPARACION';
  const sinReparacion = servicio.estado === 'COTIZADO' && servicio.cotizacionEstado === 'RECHAZADA';
  const editando = conReparacion || sinReparacion;
  const bloqueado = servicio.estado === 'COTIZADO' && !sinReparacion;

  const fechaEntrega = cambios.fechaEntrega ?? servicio.fechaEntrega ?? hoy;
  const vidaUtil = cambios.proyeccionVidaUtil ?? servicio.proyeccionVidaUtil ?? '';
  const fotos = adjuntos.filter((adjunto) => adjunto.tipo === 'FOTO_SALIDA');
  const { minFotosSalida, maxFotosSalida } = container.config();

  const actualizar = (parciales: CambiosEntrega): void => {
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
        void completar(conReparacion ? 'registrarEntrega' : 'registrarEntregaSinReparacion', {
          fechaEntrega,
          ...(vidaUtil ? { proyeccionVidaUtil: vidaUtil } : {}),
        });
      }}
    >
      <header>
        <h1>{sinReparacion ? t('etapas:entrega.sinReparacion') : t('etapas:entrega.titulo')}</h1>
        <p>
          {sinReparacion ? t('etapas:entrega.sinReparacionAyuda') : t('etapas:entrega.subtitulo')}
        </p>
      </header>

      {bloqueado ? (
        <Banner tipo="info">
          {servicio.cotizacionEstado === 'APROBADA'
            ? t('etapas:entrega.soloReparada')
            : t('etapas:entrega.soloRechazada')}
        </Banner>
      ) : (
        <>
          <Card fill>
            <div className={styles.campos!}>
              {editando ? (
                <>
                  <DateChip
                    id="fecha-entrega"
                    etiqueta={t('etapas:entrega.fecha')}
                    valor={fechaEntrega}
                    max={hoy}
                    onCambio={(valor) => actualizar({ fechaEntrega: valor })}
                  />
                  <small>{t('etapas:entrega.fechaAyuda')}</small>
                  <CampoVidaUtil
                    fechaEntrega={fechaEntrega}
                    valor={vidaUtil}
                    opcional={sinReparacion}
                    onChange={(valor) => actualizar({ proyeccionVidaUtil: valor })}
                  />
                </>
              ) : (
                <dl>
                  <dt>{t('etapas:entrega.fecha')}</dt>
                  <dd>{servicio.fechaEntrega ?? '—'}</dd>
                  <dt>{t('etapas:entrega.vidaUtil')}</dt>
                  <dd>{servicio.proyeccionVidaUtil ?? '—'}</dd>
                </dl>
              )}
            </div>
          </Card>

          <Card fill>
            <h3>{t('etapas:entrega.fotos')}</h3>
            <small>{t('etapas:entrega.fotosAyuda')}</small>
            <AdjuntosEtapa
              servicioId={servicio.id}
              tipo="FOTO_SALIDA"
              adjuntos={fotos}
              minimo={minFotosSalida}
              maximo={maxFotosSalida}
              onAgregar={(archivo) =>
                container.casosAdjuntos.agregarFoto(servicio.id, archivo, 'FOTO_SALIDA')
              }
              onEliminar={(adjuntoId) => container.casosAdjuntos.eliminarAdjunto(adjuntoId)}
            />
          </Card>
        </>
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
              {t('etapas:entrega.completar')}
            </PrimaryButton>
          ) : null}
        </div>
      </div>
    </form>
  );
}
