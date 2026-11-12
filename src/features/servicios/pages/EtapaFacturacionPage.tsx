import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { CONFIG_DEFECTO, type ConfigApp } from '@/domain/config';
import { FACTURA_REGEX } from '@/domain/validaciones';
import { CampoPdf } from '@/features/adjuntos/components/CampoPdf';
import { useAdjuntos, useCatalogo, useServicio } from '@/infrastructure/db/hooks';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Card } from '@/shared/ui/Card';
import { DateChip } from '@/shared/ui/DateChip';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { TextField } from '@/shared/ui/TextField';
import { FaltantesEtapa } from '../components/FaltantesEtapa';
import { useAutoguardado } from '../hooks/useAutoguardado';
import { useCompletarEtapa } from '../hooks/useCompletarEtapa';
import styles from './EtapaPage.module.css';

interface CambiosFactura {
  facturaFecha?: string;
  facturaNumero?: string;
}

/** Facturación (HU-007-6): cierra el servicio con el PDF de la factura. */
export function EtapaFacturacionPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation(['etapas', 'servicios']);
  const navigate = useNavigate();
  const container = useContainer();
  const servicio = useServicio(id);
  const adjuntos = useAdjuntos(id);
  const roles = useSesionStore((estado) => estado.roles);
  const configGuardada = useCatalogo<Partial<ConfigApp>>(CLAVES_CATALOGO.config, container.db);
  const config: ConfigApp = { ...CONFIG_DEFECTO, ...configGuardada };

  const [cambios, setCambios] = useState<CambiosFactura>({});
  const { completar, completando, faltantes, errorGeneral } = useCompletarEtapa({
    servicioId: id,
    roles,
    etiquetaAdjunto: (tipo) =>
      tipo === 'FACTURA' ? t('etapas:facturacion.faltante_pdf') : undefined,
  });
  const {
    estado: estadoGuardado,
    programar,
    cancelar,
  } = useAutoguardado((parciales: CambiosFactura) =>
    container.casosDeUso.actualizarCampos(id, parciales, roles)
  );

  if (!servicio) return <p role="status">{t('servicios:detalle.noEncontrado')}</p>;

  const hoy = new Date().toLocaleDateString('en-CA');
  const editando = servicio.estado === 'ENTREGADO';
  const fecha = cambios.facturaFecha ?? servicio.facturaFecha ?? hoy;
  const numero = cambios.facturaNumero ?? servicio.facturaNumero ?? '';
  const numeroInvalido = numero !== '' && !FACTURA_REGEX.test(numero);
  const facturas = adjuntos.filter((adjunto) => adjunto.tipo === 'FACTURA');

  const actualizar = (parciales: CambiosFactura): void => {
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
        if (!editando || numeroInvalido) return;
        cancelar();
        void completar('registrarFacturacion', {
          facturaFecha: fecha,
          ...(numero ? { facturaNumero: numero } : {}),
        });
      }}
    >
      <header>
        <h1>{t('etapas:facturacion.titulo')}</h1>
        <p>{t('etapas:facturacion.subtitulo')}</p>
      </header>

      <Card fill>
        <div className={styles.campos!}>
          {editando ? (
            <>
              <DateChip
                id="fecha-factura"
                etiqueta={t('etapas:facturacion.fecha')}
                valor={fecha}
                max={hoy}
                onCambio={(valor) => actualizar({ facturaFecha: valor })}
              />
              <small>{t('etapas:facturacion.fechaAyuda')}</small>
              <TextField
                id="numero-factura"
                etiqueta={t('etapas:facturacion.numero')}
                ayuda={t('etapas:facturacion.numeroAyuda')}
                value={numero}
                autoCapitalize="characters"
                error={numeroInvalido ? t('etapas:facturacion.error_numeroFormato') : undefined}
                onChange={(texto) => actualizar({ facturaNumero: texto.trim() })}
              />
            </>
          ) : (
            <dl>
              <dt>{t('etapas:facturacion.fecha')}</dt>
              <dd>{servicio.facturaFecha ?? '—'}</dd>
              <dt>{t('etapas:facturacion.numero')}</dt>
              <dd>{servicio.facturaNumero ?? '—'}</dd>
            </dl>
          )}

          <CampoPdf
            tipo="FACTURA"
            etiqueta={t('etapas:facturacion.pdf')}
            ayuda={t('etapas:facturacion.pdfAyuda')}
            textoAdjuntar={t('etapas:facturacion.adjuntar')}
            adjuntos={facturas}
            maxMB={config.maxTamanoPdfMB}
            soloLectura={!editando}
            onAgregar={(archivo, tipo) =>
              container.casosAdjuntos.agregarPdf(servicio.id, archivo, tipo)
            }
            onEliminar={(adjuntoId) => container.casosAdjuntos.eliminarAdjunto(adjuntoId)}
          />
        </div>
      </Card>

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
            <PrimaryButton type="submit" isDisabled={completando || numeroInvalido}>
              {t('etapas:facturacion.completar')}
            </PrimaryButton>
          ) : null}
        </div>
      </div>
    </form>
  );
}
