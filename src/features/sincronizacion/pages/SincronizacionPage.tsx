import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import type { ResumenPendientes } from '@/application/sync/resumenPendientes';
import { esVersionMinimaSuficiente } from '@/domain/sync/version';
import { useColaSync, useServicios } from '@/infrastructure/db/hooks';
import { buscarActualizacion } from '@/infrastructure/pwa/registerSW';
import { AppError } from '@/shared/errors';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { useOnline } from '@/shared/hooks/useOnline';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';

import { ConfirmacionCuenta } from '../components/ConfirmacionCuenta';
import { ProgresoSync } from '../components/ProgresoSync';
import { ResumenCola } from '../components/ResumenCola';
import { ResumenSyncDialog } from '../components/ResumenSyncDialog';
import { porcentajeEjecucion, useSyncStore } from '../store/useSyncStore';

import styles from './SincronizacionPage.module.css';

function nuevoCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function SincronizacionPage(): React.JSX.Element {
  const { t } = useTranslation(['sync', 'errores']);
  const container = useContainer();
  const enLinea = useOnline();
  const breakpoint = useBreakpoint();
  const cuenta = useSesionStore((estado) => estado.cuenta);
  const [searchParams, setSearchParams] = useSearchParams();
  const [resumen, setResumen] = useState<ResumenPendientes | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const configuracionCompleta = useSesionStore((estado) => estado.configuracionInicialCompleta);
  // Sin configuración inicial, la versión mínima es solo el valor por defecto: no se bloquea aún.
  const [versionObsoleta, setVersionObsoleta] = useState(
    () =>
      configuracionCompleta &&
      !esVersionMinimaSuficiente(container.appVersion, container.config().versionMinimaApp)
  );
  const [busqueda, setBusqueda] = useState<'inactiva' | 'buscando' | 'hecha'>('inactiva');
  const enCurso = useRef(false);
  const controlador = useRef<AbortController | null>(null);
  const cola = useColaSync();
  const servicios = useServicios();
  const filas = useSyncStore((estado) => estado.filas);
  const total = useSyncStore((estado) => estado.total);
  const resumenFinal = useSyncStore((estado) => estado.resumen);
  const limpiarResumen = useSyncStore((estado) => estado.limpiarResumen);
  const reanudado = useRef(false);
  const reanudar = searchParams.get('reanudar') === '1';
  const expandido = breakpoint === 'expandido' || breakpoint === 'amplio';

  const recargarResumen = useCallback(async (): Promise<ResumenPendientes | null> => {
    try {
      const nuevo = await container.resumenPendientes();
      setResumen(nuevo);
      return nuevo;
    } catch {
      return null;
    }
  }, [container]);

  useEffect(() => {
    void recargarResumen();
  }, [recargarResumen]);

  const confirmar = useCallback(async () => {
    if (!enLinea || enCurso.current || versionObsoleta) return;

    enCurso.current = true;
    setSincronizando(true);
    setError(null);

    const correlationId = nuevoCorrelationId();
    try {
      const identidad = await container.confirmarIdentidad({ correlationId });
      if (!identidad.ok) {
        if (identidad.motivo === 'TENANT_INVALIDO') setError(t('errores.tenantInvalido'));
        else if (identidad.motivo === 'SIN_ROL') setError(t('errores.sinRol'));
        return;
      }

      const pendientes = (await recargarResumen()) ?? resumen;
      useSyncStore.getState().preparar(
        (pendientes?.porServicio ?? []).map(({ servicioId, codigo, archivos }) => ({
          servicioId,
          codigo,
          archivos,
        }))
      );

      controlador.current = new AbortController();
      const final = await container.sync.sincronizar({
        correlationId,
        signal: controlador.current.signal,
      });
      // El bus ya lo registra; se aplica también aquí por si no está conectado.
      useSyncStore.getState().aplicar({ tipo: 'fin', resumen: final });
      await recargarResumen();
    } catch (causa) {
      if (causa instanceof AppError && causa.codigo === 'VERSION_OBSOLETA') {
        setVersionObsoleta(true);
      } else if (causa instanceof AppError) {
        setError(t(`errores:codigo.${causa.codigo}`, { defaultValue: t('errores.desconocido') }));
      } else {
        setError(t('errores.desconocido'));
      }
    } finally {
      if (useSyncStore.getState().sincronizando) useSyncStore.setState({ sincronizando: false });
      controlador.current = null;
      enCurso.current = false;
      setCancelando(false);
      setSincronizando(false);
    }
  }, [container, enLinea, recargarResumen, resumen, t, versionObsoleta]);

  const buscar = useCallback(async () => {
    setBusqueda('buscando');
    try {
      await buscarActualizacion();
    } finally {
      setBusqueda('hecha');
    }
  }, []);

  const cancelar = useCallback(() => {
    if (!controlador.current) return;
    setCancelando(true);
    controlador.current.abort();
  }, []);

  const reintentar = useCallback(
    async (servicioId: string) => {
      await container.reintentarServicio(servicioId);
      await recargarResumen();
    },
    [container, recargarResumen]
  );

  const usarOtraCuenta = useCallback(() => {
    setError(null);
    void container.confirmarIdentidad({ otraCuenta: true });
  }, [container]);

  useEffect(() => {
    if (!reanudar || reanudado.current) return;
    reanudado.current = true;
    setSearchParams({}, { replace: true });
    void confirmar();
  }, [confirmar, reanudar, setSearchParams]);

  return (
    <div
      className={styles.pagina!}
      data-testid="pantalla-sincronizacion"
      data-layout={expandido ? 'expandido' : 'compacto'}
    >
      <h1 className={styles.titulo!}>{t('tituloPagina')}</h1>

      {error ? <Banner tipo="peligro">{error}</Banner> : null}

      {versionObsoleta ? (
        <Banner
          tipo="advertencia"
          accion={
            <PrimaryButton isDisabled={busqueda === 'buscando'} onPress={() => void buscar()}>
              {busqueda === 'buscando'
                ? t('versionObsoleta.buscando')
                : t('versionObsoleta.buscar')}
            </PrimaryButton>
          }
        >
          {busqueda === 'hecha' ? t('versionObsoleta.buscada') : t('versionObsoleta.mensaje')}
        </Banner>
      ) : null}

      <div className={styles.contenido!}>
        <div className={styles.progreso!}>
          <ConfirmacionCuenta
            cuenta={cuenta}
            resumen={resumen}
            enLinea={enLinea}
            sincronizando={sincronizando}
            bloqueado={versionObsoleta}
            onConfirmar={() => void confirmar()}
            onOtraCuenta={usarOtraCuenta}
          />

          {sincronizando ? (
            filas.length > 0 ? (
              <ProgresoSync filas={filas} cancelando={cancelando} onCancelar={cancelar} />
            ) : (
              <Card fill>
                <p className={styles.estado!} role="status">
                  {t('estados.subiendo')}
                </p>
              </Card>
            )
          ) : null}
        </div>

        <ResumenCola
          cola={cola}
          porcentajeEnCurso={sincronizando ? porcentajeEjecucion({ total, filas }) : null}
          onReintentar={(servicioId) => void reintentar(servicioId)}
          servicios={servicios}
        />
      </div>

      <ResumenSyncDialog resumen={resumenFinal} onCerrar={limpiarResumen} />
    </div>
  );
}
