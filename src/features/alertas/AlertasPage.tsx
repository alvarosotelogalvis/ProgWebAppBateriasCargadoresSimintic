import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/containerContext';
import type { ClienteCatalogo } from '@/application/ports/remoteGateway';
import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { useCatalogo } from '@/infrastructure/db/hooks';
import { filtrarAlertasActivas, DEFAULT_UMBRALES } from '@/domain/alertas';
import type { NivelAlerta } from '@/domain/alertas';
import styles from './AlertasPage.module.css';

const TABS: { key: NivelAlerta; clave: string }[] = [
  { key: 'vencida', clave: 'vencidas' },
  { key: '30', clave: 'dias30' },
  { key: '60', clave: 'dias60' },
  { key: '90', clave: 'dias90' },
];

/** `yyyy-MM-dd` → fecha local legible, sin el desfase de interpretarla como UTC. */
const formatoFecha = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO');

export function AlertasPage() {
  const { t } = useTranslation('alertas');
  const navigate = useNavigate();
  const container = useContainer();
  const [selectedTab, setSelectedTab] = useState<NivelAlerta>('vencida');
  const [filtroCliente, setFiltroCliente] = useState('');

  const servicios = useLiveQuery(
    () => container.db.servicios.where('estado').anyOf(['ENTREGADO', 'FACTURADO']).toArray(),
    [container.db]
  );

  const clientes = useCatalogo<readonly ClienteCatalogo[]>(CLAVES_CATALOGO.clientes, container.db);

  const alertas = servicios ? filtrarAlertasActivas(servicios, DEFAULT_UMBRALES) : [];

  const filtradas = alertas.filter((a) => {
    if (a.nivel !== selectedTab) return false;
    if (filtroCliente && a.cliente.toLowerCase() !== filtroCliente.toLowerCase()) return false;
    return true;
  });

  const contadores = {
    vencida: alertas.filter((a) => a.nivel === 'vencida').length,
    '30': alertas.filter((a) => a.nivel === '30').length,
    '60': alertas.filter((a) => a.nivel === '60').length,
    '90': alertas.filter((a) => a.nivel === '90').length,
  };

  const handleClickAlerta = (servicioId: string) => {
    navigate(`/servicios/${servicioId}`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.titulo}>{t('titulo')}</h1>

      <div className={styles.filtros}>
        <div className={styles.combobox}>
          <label htmlFor="cliente-filter">{t('filtro')}</label>
          <select
            id="cliente-filter"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            className={styles.select}
          >
            <option value="">{t('todoClientes')}</option>
            {clientes?.map((c) => (
              <option key={c.id} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map(({ key, clave }) => (
          <button
            key={key}
            onClick={() => setSelectedTab(key)}
            className={`${styles.tab} ${selectedTab === key ? styles.tabActive : ''}`}
          >
            {t(clave)} ({contadores[key]})
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <p className={styles.vacio}>{t('sinAlertas')}</p>
      ) : (
        <div className={styles.lista}>
          {filtradas.map((alerta) => (
            <div
              key={alerta.servicioId}
              className={styles.fila}
              onClick={() => handleClickAlerta(alerta.servicioId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClickAlerta(alerta.servicioId);
                }
              }}
            >
              <div className={styles.codigo}>{alerta.codigo}</div>
              <div className={styles.cliente}>{alerta.cliente}</div>
              <div className={styles.serie}>{alerta.serie}</div>
              <div className={styles.fecha}>{formatoFecha(alerta.proyeccionVidaUtil)}</div>
              <div className={styles.dias}>
                {alerta.diasRestantes < 0
                  ? t('vencioHace', { count: Math.abs(alerta.diasRestantes) })
                  : t('venceEn', { count: alerta.diasRestantes })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
