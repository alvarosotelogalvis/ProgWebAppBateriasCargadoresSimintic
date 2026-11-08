import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConfigApp } from '@/domain/config';
import { useDb } from '@/shared/hooks/useDb';

export interface EstadoSP {
  sitio: string;
  idListaServicios: string;
  idBibliotecaAdjuntos: string;
  ultimaSincronizacion: string | null;
  metodoDescarga: string;
  idCorrelacion: string;
}

export function EstadoSharePoint({ config }: { readonly config: ConfigApp }): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const db = useDb();
  const [estado, setEstado] = useState<EstadoSP | null>(null);

  const cargarEstado = useCallback(async () => {
    if (!db) return;

    try {
      // Obtener última sincronización desde logs
      const logs = await db.logs
        .orderBy('seq')
        .reverse()
        .filter((log) => log.evento === 'sincronizacion-completada')
        .limit(1)
        .toArray();

      const ultimaSync = logs[0]?.ts || null;

      setEstado({
        sitio: config.SitioUrl || 'No configurado',
        idListaServicios: config.IdListaServicios || 'No configurado',
        idBibliotecaAdjuntos: config.IdBibliotecaAdjuntos || 'No configurado',
        ultimaSincronizacion: ultimaSync,
        metodoDescarga: 'Microsoft Graph',
        idCorrelacion: crypto.randomUUID?.() || 'N/A',
      });
    } catch (err) {
      console.error('Error cargando estado de SharePoint:', err);
    }
  }, [db, config.SitioUrl, config.IdListaServicios, config.IdBibliotecaAdjuntos]);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  if (!estado) {
    return <div>{t('comun.cargando')}</div>;
  }

  return (
    <div style={{ padding: 'var(--espacio-3)' }}>
      <h3 style={{ marginBottom: 'var(--espacio-3)' }}>{t('estado_sharepoint')}</h3>

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--espacio-3)' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <dt style={{ fontWeight: 500, marginBottom: 'var(--espacio-2)' }}>
            {t('sitio_sharepoint')}
          </dt>
          <dd
            style={{
              margin: 0,
              color: 'var(--color-texto-secundario)',
              fontSize: 'var(--texto-pequeno)',
              wordBreak: 'break-all',
            }}
          >
            {estado.sitio}
          </dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('id_lista_servicios')}</dt>
          <dd
            style={{
              margin: 0,
              color: 'var(--color-texto-secundario)',
              fontSize: 'var(--texto-pequeno)',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {estado.idListaServicios}
          </dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('id_biblioteca_adjuntos')}</dt>
          <dd
            style={{
              margin: 0,
              color: 'var(--color-texto-secundario)',
              fontSize: 'var(--texto-pequeno)',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {estado.idBibliotecaAdjuntos}
          </dd>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <dt style={{ fontWeight: 500 }}>{t('ultima_sincronizacion')}</dt>
          <dd style={{ margin: 0, color: 'var(--color-texto-secundario)' }}>
            {estado.ultimaSincronizacion
              ? new Date(estado.ultimaSincronizacion).toLocaleString('es-CO')
              : 'Nunca'}
          </dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('metodo_descarga')}</dt>
          <dd style={{ margin: 0, color: 'var(--color-texto-secundario)' }}>
            {estado.metodoDescarga}
          </dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('id_correlacion')}</dt>
          <dd
            style={{
              margin: 0,
              color: 'var(--color-texto-secundario)',
              fontSize: 'var(--texto-pequeno)',
              fontFamily: 'monospace',
            }}
          >
            {estado.idCorrelacion}
          </dd>
        </div>
      </dl>
    </div>
  );
}
