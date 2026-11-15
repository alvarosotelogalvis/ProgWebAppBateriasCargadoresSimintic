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
  // Plataforma
  const plataforma = navigator.platform || 'Desconocida';

  // Navegador
  const ua = navigator.userAgent || '';
  let navegador = 'Desconocido';
  if (ua.includes('Chrome')) navegador = 'Chrome';
  else if (ua.includes('Safari')) navegador = 'Safari';
  else if (ua.includes('Firefox')) navegador = 'Firefox';
  else if (ua.includes('Edge')) navegador = 'Edge';

  // Almacenamiento
  let tamanoDisponible = 0;
  let tamanoUsado = 0;
  let persistenteHabilitado = false;

  // Los métodos de StorageManager deben llamarse sobre su objeto (extraerlos lanza "Illegal invocation").
  const storage: StorageManager | undefined = navigator.storage;
  if (storage?.estimate) {
    try {
      const estimacion = await storage.estimate();
      tamanoDisponible = estimacion.quota || 0;
      tamanoUsado = estimacion.usage || 0;
    } catch {
      // Silenciar errores de StorageManager
    }
  }

  if (storage?.persisted) {
    try {
      persistenteHabilitado = (await storage.persisted()) || false;
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
          <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>{info.plataforma}</dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('navegador')}</dt>
          <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>{info.navegador}</dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('almacenamiento_persistente')}</dt>
          <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {info.persistenteHabilitado ? '✓ Habilitado' : '✗ No habilitado'}
          </dd>
        </div>

        <div>
          <dt style={{ fontWeight: 500 }}>{t('version_base_local')}</dt>
          <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>{info.versionDb}</dd>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <dt style={{ fontWeight: 500, marginBottom: 'var(--espacio-2)' }}>{t('uso_espacio')}</dt>
          <div style={{ display: 'flex', gap: 'var(--espacio-2)', alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                height: '8px',
                background: 'var(--border)',
                borderRadius: 'var(--radio-sm)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: porcentajeUsado < 80 ? 'var(--exito)' : 'var(--peligro)',
                  width: `${porcentajeUsado}%`,
                  transition: 'width 0.2s',
                }}
              />
            </div>
            <span style={{ fontSize: 'var(--texto-sm)' }}>
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
              color: 'var(--text-secondary)',
              fontSize: 'var(--texto-sm)',
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
