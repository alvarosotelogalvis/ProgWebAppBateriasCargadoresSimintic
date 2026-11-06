import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import type { ResumenPendientes } from '@/application/sync/resumenPendientes';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { useOnline } from '@/shared/hooks/useOnline';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';

import { ConfirmacionCuenta } from '../components/ConfirmacionCuenta';

import styles from './SincronizacionPage.module.css';

function nuevoCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function SincronizacionPage(): React.JSX.Element {
  const { t } = useTranslation('sync');
  const container = useContainer();
  const enLinea = useOnline();
  const breakpoint = useBreakpoint();
  const cuenta = useSesionStore((estado) => estado.cuenta);
  const [searchParams, setSearchParams] = useSearchParams();
  const [resumen, setResumen] = useState<ResumenPendientes | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);
  const reanudado = useRef(false);
  const reanudar = searchParams.get('reanudar') === '1';
  const expandido = breakpoint === 'expandido' || breakpoint === 'amplio';

  useEffect(() => {
    let vigente = true;
    void container
      .resumenPendientes()
      .then((nuevo) => {
        if (vigente) setResumen(nuevo);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [container]);

  const confirmar = useCallback(async () => {
    if (!enLinea || enCurso.current) return;

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

      const controlador = new AbortController();
      await container.sync.sincronizar({ correlationId, signal: controlador.signal });
      setResumen(await container.resumenPendientes());
    } catch {
      setError(t('errores.desconocido'));
    } finally {
      enCurso.current = false;
      setSincronizando(false);
    }
  }, [container, enLinea, t]);

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

      <div className={styles.contenido!}>
        <ConfirmacionCuenta
          cuenta={cuenta}
          resumen={resumen}
          enLinea={enLinea}
          sincronizando={sincronizando}
          onConfirmar={() => void confirmar()}
          onOtraCuenta={usarOtraCuenta}
        />

        <div className={styles.progreso!}>
          {sincronizando ? (
            <Card fill>
              <p className={styles.estado!} role="status">
                {t('estados.subiendo')}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
