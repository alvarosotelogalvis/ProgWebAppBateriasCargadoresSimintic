import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { CONFIG_DEFECTO, type ConfigApp } from '@/domain/config';
import type { CamposServicio } from '@/domain/servicio';
import { CampoPdf } from '@/features/adjuntos/components/CampoPdf';
import { useAdjuntos, useCatalogo, useServicio } from '@/infrastructure/db/hooks';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { DateChip } from '@/shared/ui/DateChip';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { TextField } from '@/shared/ui/TextField';
import CampoDiagnostico from '../components/CampoDiagnostico';
import { FaltantesEtapa } from '../components/FaltantesEtapa';
import { useCompletarEtapa } from '../hooks/useCompletarEtapa';
import { useAutoguardado } from '../hooks/useAutoguardado';
import styles from './EtapaPage.module.css';

type CambiosDiagnostico = Partial<
  Pick<CamposServicio, 'diagnostico' | 'observacionTecnica' | 'fechaSocializacionDF'>
>;

/** Diagnóstico (HU-007-1) y su rama Disposición Final (HU-007-2). */
export function EtapaDiagnosticoPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation(['etapas', 'servicios']);
  const navigate = useNavigate();
  const container = useContainer();
  const servicio = useServicio(id);
  const adjuntos = useAdjuntos(id);
  const roles = useSesionStore((estado) => estado.roles);
  const configGuardada = useCatalogo<Partial<ConfigApp>>(CLAVES_CATALOGO.config, container.db);
  const config: ConfigApp = { ...CONFIG_DEFECTO, ...configGuardada };

  const [cambios, setCambios] = useState<CambiosDiagnostico>({});
  const [confirmando, setConfirmando] = useState(false);
  const {
    completar: completarEtapa,
    completando,
    faltantes,
    errorGeneral,
  } = useCompletarEtapa({
    servicioId: id,
    roles,
    etiquetaAdjunto: (tipo) =>
      tipo === 'FORMATO_DIAGNOSTICO'
        ? t('etapas:diagnostico.faltante_pdf')
        : tipo === 'DISPOSICION_FINAL'
          ? t('etapas:disposicionFinal.faltante_pdf')
          : undefined,
  });

  const {
    estado: estadoGuardado,
    programar,
    cancelar,
  } = useAutoguardado((parciales: CambiosDiagnostico) =>
    container.casosDeUso.actualizarCampos(id, parciales, roles)
  );

  if (!servicio) return <p role="status">{t('servicios:detalle.noEncontrado')}</p>;

  const diagnostico = cambios.diagnostico ?? servicio.diagnostico ?? '';
  const observacion = cambios.observacionTecnica ?? servicio.observacionTecnica ?? '';
  const fechaSocializacion = cambios.fechaSocializacionDF ?? servicio.fechaSocializacionDF ?? '';
  const esDisposicionFinal =
    diagnostico !== '' && diagnostico === config.diagnosticoValorDisposicionFinal;
  const hoy = new Date().toLocaleDateString('en-CA');

  const actualizar = (parciales: CambiosDiagnostico): void => {
    const siguientes = { ...cambios, ...parciales };
    setCambios(siguientes);
    programar(siguientes);
  };

  const completar = async (): Promise<void> => {
    setConfirmando(false);
    cancelar();
    const parciales: CambiosDiagnostico = { ...cambios };
    if (!esDisposicionFinal) delete parciales.fechaSocializacionDF;
    await completarEtapa(
      esDisposicionFinal ? 'registrarDisposicionFinal' : 'completarDiagnostico',
      parciales
    );
  };

  const adjuntosPdf = adjuntos.filter(
    (adjunto) => adjunto.tipo === 'FORMATO_DIAGNOSTICO' || adjunto.tipo === 'DISPOSICION_FINAL'
  );
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
        if (esDisposicionFinal) setConfirmando(true);
        else void completar();
      }}
    >
      <header>
        <h1>
          {esDisposicionFinal
            ? t('etapas:disposicionFinal.titulo')
            : t('etapas:diagnostico.titulo')}
        </h1>
        <p>
          {esDisposicionFinal
            ? t('etapas:disposicionFinal.subtitulo')
            : t('etapas:diagnostico.subtitulo')}
        </p>
      </header>

      <Card fill>
        <div className={styles.campos!}>
          <CampoDiagnostico
            valor={diagnostico}
            onChange={(valor) => actualizar({ diagnostico: valor })}
          />
          <TextField
            id="observacion"
            etiqueta={t('etapas:diagnostico.observacion')}
            ayuda={t('etapas:diagnostico.observacionAyuda')}
            multilinea
            value={observacion}
            onChange={(texto) => actualizar({ observacionTecnica: texto })}
          />
          <CampoPdf
            tipo="FORMATO_DIAGNOSTICO"
            etiqueta={t('etapas:diagnostico.formatoPdf')}
            ayuda={t('etapas:diagnostico.formatoPdfAyuda')}
            textoAdjuntar={t('etapas:diagnostico.adjuntar')}
            adjuntos={adjuntosPdf}
            maxMB={config.maxTamanoPdfMB}
            onAgregar={(archivo, tipo) =>
              container.casosAdjuntos.agregarPdf(servicio.id, archivo, tipo)
            }
            onEliminar={(adjuntoId) => container.casosAdjuntos.eliminarAdjunto(adjuntoId)}
          />
        </div>
      </Card>

      {esDisposicionFinal ? (
        <Card fill>
          <div className={styles.campos!}>
            <Banner tipo="advertencia">{t('etapas:disposicionFinal.aviso')}</Banner>
            <DateChip
              id="fecha-socializacion"
              etiqueta={t('etapas:disposicionFinal.fechaSocializacion')}
              valor={fechaSocializacion}
              max={hoy}
              onCambio={(valor) => actualizar({ fechaSocializacionDF: valor })}
            />
            <small>{t('etapas:disposicionFinal.fechaSocializacionAyuda')}</small>
            <CampoPdf
              tipo="DISPOSICION_FINAL"
              etiqueta={t('etapas:disposicionFinal.disposicionPdf')}
              ayuda={t('etapas:disposicionFinal.disposicionPdfAyuda')}
              textoAdjuntar={t('etapas:diagnostico.adjuntar')}
              adjuntos={adjuntosPdf}
              maxMB={config.maxTamanoPdfMB}
              onAgregar={(archivo, tipo) =>
                container.casosAdjuntos.agregarPdf(servicio.id, archivo, tipo)
              }
              onEliminar={(adjuntoId) => container.casosAdjuntos.eliminarAdjunto(adjuntoId)}
            />
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
            {t('etapas:cancelar')}
          </SecondaryButton>
          <PrimaryButton type="submit" isDisabled={completando}>
            {esDisposicionFinal
              ? t('etapas:disposicionFinal.completar')
              : t('etapas:diagnostico.completar')}
          </PrimaryButton>
        </div>
      </div>

      <ResponsiveDialog
        titulo={t('etapas:disposicionFinal.confirmarTitulo')}
        abierto={confirmando}
        onCerrar={() => setConfirmando(false)}
      >
        <p>{t('etapas:disposicionFinal.confirmarTexto')}</p>
        <div className={styles.acciones!}>
          <SecondaryButton onPress={() => setConfirmando(false)}>
            {t('etapas:cancelar')}
          </SecondaryButton>
          <PrimaryButton onPress={() => void completar()}>
            {t('etapas:disposicionFinal.confirmar')}
          </PrimaryButton>
        </div>
      </ResponsiveDialog>
    </form>
  );
}
