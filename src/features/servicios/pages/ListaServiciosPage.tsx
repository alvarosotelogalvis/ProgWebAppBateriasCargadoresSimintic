import { lazy, Suspense, useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  filtrarServicios,
  type FiltrosServicios as Filtros,
} from '@/application/servicios/buscarServicios';
import { cumpleTarjeta, tarjetaPorClave } from '@/domain/tarjetasInicio';
import { useConsultasServicios } from '@/features/servicios/useConsultasServicios';
import { Banner } from '@/shared/ui/Banner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PillInput } from '@/shared/ui/PillInput';
import { SyncBadge } from '@/shared/ui/SyncBadge';
import { StatusBadge } from '@/shared/ui/StatusBadge';

import styles from './ListaServiciosPage.module.css';

// El panel de filtros arrastra los selectores y el calendario (~55 KB comprimidos): se carga al abrirlo y no en
// la primera visita a la lista, que se queda dentro del presupuesto de 350 KB (RNF-06).
const FiltrosServicios = lazy(() =>
  import('@/features/servicios/components/FiltrosServicios').then((modulo) => ({
    default: modulo.FiltrosServicios,
  }))
);

const ESTADOS = [
  'BORRADOR',
  'RECIBIDO',
  'DIAGNOSTICADO',
  'COTIZADO',
  'EN_REPARACION',
  'ENTREGADO',
  'FACTURADO',
  'DISPOSICION_FINAL',
  'ANULADO',
] as const;

export function ListaServiciosPage(): React.JSX.Element {
  const { t } = useTranslation(['servicios', 'common', 'inicio']);
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const tarjeta = tarjetaPorClave(parametros.get('tarjeta') ?? '');
  const { servicios, hoy } = useConsultasServicios();
  const [texto, setTexto] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosPanel, setFiltrosPanel] = useState<Filtros>({});
  const diferido = useDeferredValue(texto);

  const filtros = useMemo<Filtros>(
    () => ({ ...filtrosPanel, texto: diferido }),
    [filtrosPanel, diferido]
  );

  const visibles = useMemo(() => {
    const filtrados = filtrarServicios(servicios, filtros);
    return tarjeta ? filtrados.filter((servicio) => cumpleTarjeta(servicio, tarjeta)) : filtrados;
  }, [servicios, filtros, tarjeta]);

  return (
    <div className={styles.pagina!}>
      <div className={styles.cabecera!}>
        <h1>{t('servicios:titulo')}</h1>
        <p className={styles.conteo!}>{t('servicios:resultados', { count: visibles.length })}</p>
      </div>

      <div className={styles.barra!}>
        <PillInput valor={texto} onCambio={setTexto} etiqueta={t('servicios:buscar')} />
        <button
          type="button"
          className={styles.filtroToggle!}
          onClick={() => setMostrarFiltros((valor) => !valor)}
          aria-expanded={mostrarFiltros}
        >
          {t('servicios:filtros')}
        </button>
      </div>

      {tarjeta ? (
        <Banner
          tipo="info"
          accion={
            <button type="button" onClick={() => setParametros({})}>
              {t('servicios:lista.quitarFiltro')}
            </button>
          }
        >
          {t('servicios:lista.filtroTarjeta', { nombre: t(`inicio:tarjetas.${tarjeta.clave}`) })}
        </Banner>
      ) : null}

      {mostrarFiltros ? (
        <Suspense fallback={null}>
          <FiltrosServicios
            valor={filtrosPanel}
            hoy={hoy}
            onCambio={setFiltrosPanel}
            onAplicar={() => setMostrarFiltros(false)}
          />
        </Suspense>
      ) : null}

      {visibles.length === 0 ? (
        <EmptyState
          titulo={servicios.length === 0 ? t('servicios:vacio') : t('servicios:sinResultados')}
          descripcion={
            servicios.length === 0
              ? t('servicios:vacioDescripcion')
              : t('servicios:sinResultadosDescripcion')
          }
          icono="servicios"
        />
      ) : (
        <ul className={styles.lista!}>
          {visibles.map((servicio) => {
            const sync =
              servicio.syncState === 'synced'
                ? { estado: 'sincronizado' as const, texto: t('servicios:sync.synced') }
                : servicio.syncState === 'error' || servicio.syncState === 'conflict'
                  ? { estado: 'error' as const, texto: t('servicios:sync.error') }
                  : { estado: 'pendiente' as const, texto: t('servicios:sync.pending') };
            const estadoBadge = (ESTADOS as readonly string[]).includes(servicio.estado)
              ? (servicio.estado as (typeof ESTADOS)[number])
              : 'BORRADOR';
            return (
              <li key={servicio.id}>
                <button
                  type="button"
                  className={styles.fila!}
                  onClick={() => navigate(`/servicios/${servicio.id}`)}
                >
                  <span className={styles.principal!}>
                    <span className={styles.codigo!}>
                      {servicio.codigo || t('servicios:lista.sinCodigo')}
                    </span>
                    <span className={styles.secundario!}>
                      {servicio.clienteNombre || t('servicios:lista.sinCliente')} ·{' '}
                      {servicio.serie || t('servicios:lista.sinSerie')}
                    </span>
                    <span className={styles.fecha!}>{servicio.fechaRecepcion}</span>
                  </span>
                  <span className={styles.badges!}>
                    <StatusBadge
                      estado={estadoBadge}
                      etiqueta={t(`servicios:estado.${estadoBadge}`)}
                    />
                    <SyncBadge estado={sync.estado} etiqueta={sync.texto} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
