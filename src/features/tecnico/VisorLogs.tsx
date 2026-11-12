import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EntradaLog } from '@/infrastructure/db/dexie';
import { consultarLogs } from '@/infrastructure/logging/logger';
import { useDb } from '@/shared/hooks/useDb';

interface FiltrosLogs {
  nivel?: EntradaLog['nivel'];
  busqueda?: string;
}

export function VisorLogs(): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const db = useDb();
  const idNivel = useId();
  const idBusqueda = useId();
  const [logs, setLogs] = useState<EntradaLog[]>([]);
  const [filtros, setFiltros] = useState<FiltrosLogs>({});
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarLogs = async () => {
      if (!db) return;
      setCargando(true);
      try {
        const opciones: Exclude<Parameters<typeof consultarLogs>[1], undefined> = {
          limite: 100,
        };
        if (filtros.nivel) opciones.nivel = filtros.nivel;
        if (filtros.busqueda) opciones.busqueda = filtros.busqueda;

        const resultados = await consultarLogs(db, opciones);
        setLogs(resultados);
      } catch (err) {
        console.error('Error cargando logs:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarLogs();
  }, [db, filtros]);

  const niveles: Array<EntradaLog['nivel']> = ['debug', 'info', 'warn', 'error'];

  return (
    <div style={{ padding: 'var(--espacio-3)' }}>
      <h3 style={{ marginBottom: 'var(--espacio-3)' }}>{t('registros')}</h3>

      {/* Filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--espacio-2)',
          marginBottom: 'var(--espacio-3)',
        }}
      >
        <div>
          <label htmlFor={idNivel} style={{ display: 'block', marginBottom: 'var(--espacio-1)' }}>
            <strong>{t('nivel_log')}</strong>
          </label>
          <select
            id={idNivel}
            value={filtros.nivel || ''}
            onChange={(e) =>
              setFiltros({
                ...filtros,
                nivel: (e.target.value as EntradaLog['nivel']) || undefined,
              })
            }
            style={{
              width: '100%',
              padding: 'var(--espacio-1)',
              borderRadius: 'var(--radio-1)',
              border: '1px solid var(--color-borde)',
            }}
          >
            <option value="">{t('filtrar')}</option>
            {niveles.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={idBusqueda}
            style={{ display: 'block', marginBottom: 'var(--espacio-1)' }}
          >
            <strong>{t('evento')}</strong>
          </label>
          <input
            id={idBusqueda}
            type="text"
            value={filtros.busqueda || ''}
            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
            placeholder={t('filtrar')}
            style={{
              width: '100%',
              padding: 'var(--espacio-1)',
              borderRadius: 'var(--radio-1)',
              border: '1px solid var(--color-borde)',
            }}
          />
        </div>
      </div>

      {/* Tabla de logs */}
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid var(--color-borde)',
          borderRadius: 'var(--radio-1)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 'var(--texto-pequeno)',
          }}
        >
          <thead>
            <tr style={{ background: 'var(--color-fondo-secundario)' }}>
              <th style={{ padding: 'var(--espacio-2)', textAlign: 'left' }}>{t('fecha')}</th>
              <th style={{ padding: 'var(--espacio-2)', textAlign: 'left' }}>{t('nivel_log')}</th>
              <th style={{ padding: 'var(--espacio-2)', textAlign: 'left' }}>{t('evento')}</th>
              <th style={{ padding: 'var(--espacio-2)', textAlign: 'left' }}>{t('mensaje')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !cargando ? (
              <tr>
                <td colSpan={4} style={{ padding: 'var(--espacio-2)', textAlign: 'center' }}>
                  {t('sin_cambios')}
                </td>
              </tr>
            ) : null}
            {logs.map((log) => (
              <tr key={log.seq} style={{ borderTop: '1px solid var(--color-borde)' }}>
                <td style={{ padding: 'var(--espacio-2)' }}>
                  {new Date(log.ts).toLocaleTimeString('es-CO')}
                </td>
                <td
                  style={{
                    padding: 'var(--espacio-2)',
                    color:
                      log.nivel === 'error'
                        ? 'var(--color-peligro)'
                        : log.nivel === 'warn'
                          ? 'var(--color-advertencia)'
                          : 'inherit',
                    fontWeight: log.nivel === 'error' ? 'bold' : 'normal',
                  }}
                >
                  {log.nivel.toUpperCase()}
                </td>
                <td style={{ padding: 'var(--espacio-2)' }}>{log.evento}</td>
                <td style={{ padding: 'var(--espacio-2)' }}>
                  {typeof log.datos === 'object' ? JSON.stringify(log.datos).slice(0, 100) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cargando ? (
        <div style={{ marginTop: 'var(--espacio-2)', textAlign: 'center' }}>
          {t('comun.cargando')}
        </div>
      ) : null}
    </div>
  );
}
