import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDb } from '@/shared/hooks/useDb';
import { CLAVES_META } from '@/application/setup/claves';

export interface EstadoSP {
  sitio: string;
  siteId: string;
  webUrl: string;
  /** Id de la lista `Servicios` (dentro del mapa de listas guardado en la configuración). */
  idListaServicios: string;
  /** Id de la biblioteca de adjuntos (drive). */
  idBibliotecaAdjuntos: string;
  ultimaSincronizacion: string | null;
  metodoDescarga: string;
  idCorrelacion: string;
}

export function EstadoSharePoint(): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const db = useDb();
  const [estado, setEstado] = useState<EstadoSP | null>(null);

  const cargarEstado = useCallback(async () => {
    if (!db) return;

    try {
      // Leer datos de SharePoint desde meta
      const sitio = (await db.meta.get(CLAVES_META.sitio))?.valor as string | undefined;
      const siteId = (await db.meta.get(CLAVES_META.siteId))?.valor as string | undefined;
      const webUrl = (await db.meta.get(CLAVES_META.webUrl))?.valor as string | undefined;
      const listas = (await db.meta.get(CLAVES_META.listIds))?.valor as
        Record<string, string> | undefined;
      const driveId = (await db.meta.get(CLAVES_META.driveId))?.valor as string | undefined;
      const ultimaSyncEn = (await db.meta.get(CLAVES_META.ultimaSyncEn))?.valor as
        string | undefined;
      const ultimoCorrelationId = (await db.meta.get(CLAVES_META.ultimoCorrelationId))?.valor as
        string | undefined;

      setEstado({
        sitio: sitio || 'No configurado',
        siteId: siteId || 'No configurado',
        webUrl: webUrl || 'No configurado',
        idListaServicios: listas?.Servicios || 'No configurado',
        idBibliotecaAdjuntos: driveId || 'No configurado',
        ultimaSincronizacion: ultimaSyncEn || null,
        metodoDescarga: 'Microsoft Graph',
        idCorrelacion: ultimoCorrelationId || 'N/A',
      });
    } catch (err) {
      console.error('Error cargando estado de SharePoint:', err);
    }
  }, [db]);

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
              color: 'var(--text-secondary)',
              fontSize: 'var(--texto-sm)',
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
              color: 'var(--text-secondary)',
              fontSize: 'var(--texto-sm)',
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
              color: 'var(--text-secondary)',
              fontSize: 'var(--texto-sm)',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {estado.idBibliotecaAdjuntos}
          </dd>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <dt style={{ fontWeight: 500 }}>{t('ultima_sincronizacion')}</dt>
          <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {estado.ultimaSincronizacion
              ? new Date(estado.ultimaSincronizacion).toLocaleString('es-CO')
              : 'Nunca'}
          </dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('metodo_descarga')}</dt>
          <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>{estado.metodoDescarga}</dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('id_correlacion')}</dt>
          <dd
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: 'var(--texto-sm)',
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
