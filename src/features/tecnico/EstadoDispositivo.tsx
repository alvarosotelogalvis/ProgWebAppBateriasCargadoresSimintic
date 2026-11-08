import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface InfoDispositivo {
  plataforma: string;
  navegador: string;
  tamanoDisponible: number;
  tamanoUsado: number;
  persistenteHabilitado: boolean;
  dispositivoId: string;
  versionDb: string;
}

const obtenerInfo = async (): Promise<InfoDispositivo> => {
  const nav = navigator as Record<string, unknown>;

  // Plataforma
  const plataforma = (nav.platform as string) || 'Desconocida';

  // Navegador
  const ua = (nav.userAgent as string) || '';
  let navegador = 'Desconocido';
  if (ua.includes('Chrome')) navegador = 'Chrome';
  else if (ua.includes('Safari')) navegador = 'Safari';
  else if (ua.includes('Firefox')) navegador = 'Firefox';
  else if (ua.includes('Edge')) navegador = 'Edge';

  // Almacenamiento
  let tamanoDisponible = 0;
  let tamanoUsado = 0;
  let persistenteHabilitado = false;

  const storage = nav.storage as Record<string, unknown>;
  if (storage?.estimate) {
    try {
      const est = (await (storage.estimate as () => Promise<Record<string, unknown>>)()) || {};
      tamanoDisponible = (est.quota as number) || 0;
      tamanoUsado = (est.usage as number) || 0;
    } catch {
      // Silenciar errores de StorageManager
    }
  }

  if (storage?.persisted) {
    try {
      persistenteHabilitado = (await (storage.persisted as () => Promise<boolean>)()) || false;
    } catch {
      // Silenciar errores
    }
  }

  // ID del dispositivo (hash simple de plataforma + navegador)
  const dispositivoId = `${plataforma}-${navegador}-${Date.now()}`;

  // Versión de DB
  const versionDb = '1.0.0';

  return {
    plataforma,
    navegador,
    tamanoDisponible,
    tamanoUsado,
    persistenteHabilitado,
    dispositivoId,
    versionDb,
  };
};

export function EstadoDispositivo(): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const [info, setInfo] = useState<InfoDispositivo | null>(null);

  useEffect(() => {
    obtenerInfo().then(setInfo);
  }, []);

  if (!info) {
    return <div>{t('comun.cargando')}</div>;
  }

  const porcentajeUsado =
    info.tamanoDisponible > 0 ? Math.round((info.tamanoUsado / info.tamanoDisponible) * 100) : 0;

  return (
    <div style={{ padding: 'var(--espacio-3)' }}>
      <h3 style={{ marginBottom: 'var(--espacio-3)' }}>{t('estado_dispositivo')}</h3>

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--espacio-3)' }}>
        <div>
          <dt style={{ fontWeight: 500 }}>{t('plataforma')}</dt>
          <dd style={{ margin: 0, color: 'var(--color-texto-secundario)' }}>{info.plataforma}</dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('navegador')}</dt>
          <dd style={{ margin: 0, color: 'var(--color-texto-secundario)' }}>{info.navegador}</dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('almacenamiento_persistente')}</dt>
          <dd style={{ margin: 0, color: 'var(--color-texto-secundario)' }}>
            {info.persistenteHabilitado ? '✓ Habilitado' : '✗ No habilitado'}
          </dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('version_base_local')}</dt>
          <dd style={{ margin: 0, color: 'var(--color-texto-secundario)' }}>{info.versionDb}</dd>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <dt style={{ fontWeight: 500, marginBottom: 'var(--espacio-2)' }}>{t('uso_espacio')}</dt>
          <div style={{ display: 'flex', gap: 'var(--espacio-2)', alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                height: '8px',
                background: 'var(--color-borde)',
                borderRadius: 'var(--radio-1)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: porcentajeUsado < 80 ? 'var(--color-exito)' : 'var(--color-peligro)',
                  width: `${porcentajeUsado}%`,
                  transition: 'width 0.2s',
                }}
              />
            </div>
            <span style={{ fontSize: 'var(--texto-pequeno)' }}>
              {Math.round(info.tamanoUsado / 1024 / 1024)} MB /{' '}
              {Math.round(info.tamanoDisponible / 1024 / 1024)} MB ({porcentajeUsado}%)
            </span>
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <dt style={{ fontWeight: 500, marginBottom: 'var(--espacio-2)' }}>
            {t('identificador_dispositivo')}
          </dt>
          <dd
            style={{
              margin: 0,
              color: 'var(--color-texto-secundario)',
              fontSize: 'var(--texto-pequeno)',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}
          >
            {info.dispositivoId}
          </dd>
        </div>
      </dl>
    </div>
  );
}
