import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/containerContext';
import { filtrarAlertasActivas, DEFAULT_UMBRALES } from '@/domain/alertas';
import type { NivelAlerta } from '@/domain/alertas';
import styles from './AlertasPage.module.css';

const TABS: { key: NivelAlerta; label: string }[] = [
  { key: 'vencida', label: 'Vencidas' },
  { key: '30', label: '≤30 días' },
  { key: '60', label: '≤60 días' },
  { key: '90', label: '≤90 días' },
];

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

  const clientes = useLiveQuery(
    () => container.db.catalogos.where('tipo').equals('Cliente').toArray(),
    [container.db]
  );

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
              <option key={c.id} value={c.valor}>
                {c.valor}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedTab(key)}
            className={`${styles.tab} ${selectedTab === key ? styles.tabActive : ''}`}
          >
            {label} ({contadores[key]})
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
              <div className={styles.fecha}>
                {alerta.proyeccionVidaUtil.toLocaleDateString('es-CO')}
              </div>
              <div className={styles.dias}>{alerta.textoFecha}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
