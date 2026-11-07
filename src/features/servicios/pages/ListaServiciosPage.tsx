import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  filtrarServicios,
  type FiltrosServicios as Filtros,
} from '@/application/servicios/buscarServicios';
import { FiltrosServicios } from '@/features/servicios/components/FiltrosServicios';
import { useConsultasServicios } from '@/features/servicios/useConsultasServicios';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PillInput } from '@/shared/ui/PillInput';
import { SyncBadge } from '@/shared/ui/SyncBadge';
import { StatusBadge } from '@/shared/ui/StatusBadge';

import styles from './ListaServiciosPage.module.css';

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
  const { t } = useTranslation(['servicios', 'common']);
  const navigate = useNavigate();
  const { servicios, hoy } = useConsultasServicios();
  const [texto, setTexto] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosPanel, setFiltrosPanel] = useState<Filtros>({});
  const diferido = useDeferredValue(texto);

  const filtros = useMemo<Filtros>(
    () => ({ ...filtrosPanel, texto: diferido }),
    [filtrosPanel, diferido]
  );

  const visibles = useMemo(() => filtrarServicios(servicios, filtros), [servicios, filtros]);

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

      {mostrarFiltros ? (
        <FiltrosServicios
          valor={filtrosPanel}
          hoy={hoy}
          onCambio={setFiltrosPanel}
          onAplicar={() => setMostrarFiltros(false)}
        />
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
