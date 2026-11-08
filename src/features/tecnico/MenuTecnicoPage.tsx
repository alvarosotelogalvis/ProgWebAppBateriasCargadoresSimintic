import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConfigApp } from '@/domain/config';
import { EstadoDispositivo } from './EstadoDispositivo';
import { EstadoSharePoint } from './EstadoSharePoint';
import { VisorLogs } from './VisorLogs';
import { ExportarRespaldoDialog } from './ExportarRespaldoDialog';
import { ImportarRespaldoDialog } from './ImportarRespaldoDialog';
import { LiberarEspacioDialog } from './LiberarEspacioDialog';
import { useDb } from '@/shared/hooks/useDb';
import type { Servicio } from '@/domain/servicio';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';

type Tab = 'dispositivo' | 'sharepoint' | 'logs';
type DialogoAbierto = 'exportar' | 'importar' | 'liberar' | null;

interface Props {
  readonly config: ConfigApp;
  readonly servicios?: unknown[];
  readonly onRestablecerApp?: () => Promise<void>;
}

export function MenuTecnicoPage({
  config: _config,
  servicios = [],
  onRestablecerApp,
}: Props): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const db = useDb();
  const [tabActiva, setTabActiva] = useState<Tab>('dispositivo');
  const [dialogoAbierto, setDialogoAbierto] = useState<DialogoAbierto>(null);

  const handleExportar = () => setDialogoAbierto('exportar');
  const handleImportar = () => setDialogoAbierto('importar');
  const handleLiberar = () => setDialogoAbierto('liberar');

  return (
    <div style={{ padding: 'var(--espacio-4)' }}>
      <h1 style={{ marginBottom: 'var(--espacio-3)' }}>{t('titulo')}</h1>

      {/* Tabs de navegación */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--espacio-2)',
          marginBottom: 'var(--espacio-4)',
          borderBottom: '1px solid var(--color-borde)',
          overflowX: 'auto',
        }}
      >
        {(['dispositivo', 'sharepoint', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setTabActiva(tab)}
            style={{
              padding: 'var(--espacio-2) var(--espacio-3)',
              background: tabActiva === tab ? 'var(--color-primario)' : 'transparent',
              color: tabActiva === tab ? 'white' : 'inherit',
              border: 'none',
              borderRadius: 'var(--radio-1)',
              cursor: 'pointer',
              fontWeight: tabActiva === tab ? 'bold' : 'normal',
              whiteSpace: 'nowrap',
            }}
          >
            {tab === 'dispositivo' && t('estado_dispositivo')}
            {tab === 'sharepoint' && t('estado_sharepoint')}
            {tab === 'logs' && t('registros')}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div
        style={{
          background: 'var(--color-fondo-secundario)',
          borderRadius: 'var(--radio-2)',
          padding: 'var(--espacio-3)',
          marginBottom: 'var(--espacio-4)',
        }}
      >
        {tabActiva === 'dispositivo' && <EstadoDispositivo />}
        {tabActiva === 'sharepoint' && <EstadoSharePoint />}
        {tabActiva === 'logs' && <VisorLogs />}
      </div>

      {/* Acciones de mantenimiento */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--espacio-3)',
        }}
      >
        <div
          style={{
            padding: 'var(--espacio-3)',
            background: 'var(--color-fondo-secundario)',
            borderRadius: 'var(--radio-2)',
          }}
        >
          <h3>{t('respaldo')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espacio-2)' }}>
            <PrimaryButton onPress={handleExportar} size="small">
              {t('exportar_respaldo')}
            </PrimaryButton>
            <PrimaryButton onPress={handleImportar} size="small">
              {t('importar_respaldo')}
            </PrimaryButton>
            <PrimaryButton onPress={handleLiberar} size="small">
              {t('liberar_espacio')}
            </PrimaryButton>
          </div>
        </div>

        <div
          style={{
            padding: 'var(--espacio-3)',
            background: 'var(--color-fondo-secundario)',
            borderRadius: 'var(--radio-2)',
          }}
        >
          <h3>{t('acciones_mantenimiento')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espacio-2)' }}>
            {onRestablecerApp && (
              <PrimaryButton onPress={onRestablecerApp} size="small">
                {t('restablecer_app')}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>

      {/* Diálogos */}
      {db && (
        <>
          <ExportarRespaldoDialog
            abierto={dialogoAbierto === 'exportar'}
            servicios={servicios as Servicio[]}
            onCerrar={() => setDialogoAbierto(null)}
          />
          <ImportarRespaldoDialog
            abierto={dialogoAbierto === 'importar'}
            serviciosExistentes={servicios as Servicio[]}
            onImportados={() => setDialogoAbierto(null)}
            onCerrar={() => setDialogoAbierto(null)}
          />
          <LiberarEspacioDialog
            abierto={dialogoAbierto === 'liberar'}
            db={db!}
            onCerrar={() => setDialogoAbierto(null)}
          />
        </>
      )}
    </div>
  );
}
