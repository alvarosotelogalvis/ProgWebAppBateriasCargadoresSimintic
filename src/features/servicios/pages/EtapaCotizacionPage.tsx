import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { ROLES_RESPUESTA_COTIZACION } from '@/application/servicios/cambiarRespuestaCotizacion';
import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { CONFIG_DEFECTO, type ConfigApp } from '@/domain/config';
import type { EstadoCotizacion } from '@/domain/servicio';
import { CampoPdf } from '@/features/adjuntos/components/CampoPdf';
import { useAdjuntos, useCatalogo, useServicio } from '@/infrastructure/db/hooks';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { DateChip } from '@/shared/ui/DateChip';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import CampoMoneda from '../components/CampoMoneda';
import { FaltantesEtapa } from '../components/FaltantesEtapa';
import { useAutoguardado } from '../hooks/useAutoguardado';
import { useCompletarEtapa } from '../hooks/useCompletarEtapa';
import styles from './EtapaPage.module.css';

interface CambiosCotizacion {
  cotizacionFechaEnvio?: string;
  cotizacionValor?: number;
}

const formatoCOP = (valor: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);

/** Cotización (HU-007-3): datos de envío en DIAGNOSTICADO y respuesta del cliente en COTIZADO. */
export function EtapaCotizacionPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation(['etapas', 'servicios']);
  const navigate = useNavigate();
  const container = useContainer();
  const servicio = useServicio(id);
  const adjuntos = useAdjuntos(id);
  const roles = useSesionStore((estado) => estado.roles);
  const configGuardada = useCatalogo<Partial<ConfigApp>>(CLAVES_CATALOGO.config, container.db);
  const config: ConfigApp = { ...CONFIG_DEFECTO, ...configGuardada };

  const [cambios, setCambios] = useState<CambiosCotizacion>({});
  const [errorRespuesta, setErrorRespuesta] = useState(false);
  const { completar, completando, faltantes, errorGeneral } = useCompletarEtapa({
    servicioId: id,
    roles,
  });
  const {
    estado: estadoGuardado,
    programar,
    cancelar,
  } = useAutoguardado((parciales: CambiosCotizacion) =>
    container.casosDeUso.actualizarCampos(id, parciales, roles)
  );

  if (!servicio) return <p role="status">{t('servicios:detalle.noEncontrado')}</p>;

  const hoy = new Date().toLocaleDateString('en-CA');
  const editando = servicio.estado === 'DIAGNOSTICADO';
  const fecha = cambios.cotizacionFechaEnvio ?? servicio.cotizacionFechaEnvio ?? hoy;
  const valor = cambios.cotizacionValor ?? servicio.cotizacionValor ?? 0;
  const respuesta = servicio.cotizacionEstado ?? 'PENDIENTE';
  const puedeResponder =
    servicio.estado === 'COTIZADO' && roles.some((rol) => ROLES_RESPUESTA_COTIZACION.includes(rol));
  const adjuntosCotizacion = adjuntos.filter((adjunto) => adjunto.tipo === 'COTIZACION');

  const actualizar = (parciales: CambiosCotizacion): void => {
    const siguientes = { ...cambios, ...parciales };
    setCambios(siguientes);
    programar(siguientes);
  };

  const cambiarRespuesta = async (nueva: string): Promise<void> => {
    setErrorRespuesta(false);
    try {
      await container.casosDeUso.cambiarRespuestaCotizacion(
        servicio.id,
        nueva as EstadoCotizacion,
        roles
      );
    } catch {
      setErrorRespuesta(true);
    }
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
        void completar('registrarCotizacion', {
          cotizacionFechaEnvio: fecha,
          cotizacionValor: valor,
        });
      }}
    >
      <header>
        <h1>{t('etapas:cotizacion.titulo')}</h1>
        <p>{t('etapas:cotizacion.subtitulo')}</p>
      </header>

      <Card fill>
        <div className={styles.campos!}>
          {editando ? (
            <>
              <DateChip
                id="fecha-envio"
                etiqueta={t('etapas:cotizacion.fechaEnvio')}
                valor={fecha}
                max={hoy}
                onCambio={(valorFecha) => actualizar({ cotizacionFechaEnvio: valorFecha })}
              />
              <small>{t('etapas:cotizacion.fechaEnvioAyuda')}</small>
              <CampoMoneda
                label={t('etapas:cotizacion.valor')}
                valor={valor}
                onChange={(monto) => actualizar({ cotizacionValor: monto })}
                helpText={t('etapas:cotizacion.valorAyuda')}
              />
            </>
          ) : (
            <dl>
              <dt>{t('etapas:cotizacion.fechaEnvio')}</dt>
              <dd>{servicio.cotizacionFechaEnvio ?? '—'}</dd>
              <dt>{t('etapas:cotizacion.valor')}</dt>
              <dd>{formatoCOP(servicio.cotizacionValor ?? 0)}</dd>
            </dl>
          )}

          <CampoPdf
            tipo="COTIZACION"
            etiqueta={t('etapas:cotizacion.cotizacionPdf')}
            ayuda={t('etapas:cotizacion.cotizacionPdfAyuda')}
            textoAdjuntar={t('etapas:cotizacion.adjuntar')}
            adjuntos={adjuntosCotizacion}
            maxMB={config.maxTamanoPdfMB}
            soloLectura={!editando}
            onAgregar={(archivo, tipo) =>
              container.casosAdjuntos.agregarPdf(servicio.id, archivo, tipo)
            }
            onEliminar={(adjuntoId) => container.casosAdjuntos.eliminarAdjunto(adjuntoId)}
          />
        </div>
      </Card>

      {!editando ? (
        <Card fill>
          <div className={styles.campos!}>
            <span>{t('etapas:cotizacion.respuesta')}</span>
            <SegmentedControl
              aria-label={t('etapas:cotizacion.respuesta')}
              isDisabled={!puedeResponder}
              selectedKey={respuesta}
              onChange={(nueva) => void cambiarRespuesta(nueva)}
              items={[
                { id: 'PENDIENTE', etiqueta: t('etapas:cotizacion.respuestaPendiente') },
                { id: 'APROBADA', etiqueta: t('etapas:cotizacion.respuestaAprobada') },
                { id: 'RECHAZADA', etiqueta: t('etapas:cotizacion.respuestaRechazada') },
              ]}
            />
            {errorRespuesta ? (
              <Banner tipo="peligro">{t('etapas:errores.ESTADO')}</Banner>
            ) : (
              <small>{t('etapas:cotizacion.respuestaAyuda')}</small>
            )}
          </div>
        </Card>
      ) : null}

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
              {t('etapas:cotizacion.completar')}
            </PrimaryButton>
          ) : null}
        </div>
      </div>
    </form>
  );
}
