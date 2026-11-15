import { useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { useDb } from '@/shared/hooks/useDb';
import { Card } from '@/shared/ui/Card';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import { EstadoDispositivo } from './EstadoDispositivo';
import { EstadoSharePoint } from './EstadoSharePoint';
import { ExportarRespaldoDialog } from './ExportarRespaldoDialog';
import { ImportarRespaldoDialog } from './ImportarRespaldoDialog';
import { LiberarEspacioDialog } from './LiberarEspacioDialog';
import styles from './MenuTecnicoPage.module.css';
import { RestablecerAppDialog } from './RestablecerAppDialog';
import { VisorLogs } from './VisorLogs';

type DialogoAbierto = 'exportar' | 'importar' | 'liberar' | 'restablecer' | null;

interface Props {
  /** Restablece la app; si se omite, la acción no se ofrece. */
  readonly onRestablecerApp?: () => Promise<void>;
}

/** Menú técnico (solo Administrador): diagnóstico, registros, respaldo y mantenimiento. */
export function MenuTecnicoPage({ onRestablecerApp }: Props): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const db = useDb();
  const [dialogo, setDialogo] = useState<DialogoAbierto>(null);
  const cerrar = (): void => setDialogo(null);

  return (
    <div className={styles.pagina!}>
      <h1>{t('titulo')}</h1>

      <Card fill>
        <Tabs>
          <TabList className={styles.pestanas!} aria-label={t('titulo')}>
            <Tab id="dispositivo" className={styles.pestana!}>
              {t('estado_dispositivo')}
            </Tab>
            <Tab id="sharepoint" className={styles.pestana!}>
              {t('estado_sharepoint')}
            </Tab>
            <Tab id="logs" className={styles.pestana!}>
              {t('registros')}
            </Tab>
          </TabList>
          <TabPanel id="dispositivo">
            <EstadoDispositivo />
          </TabPanel>
          <TabPanel id="sharepoint">
            <EstadoSharePoint />
          </TabPanel>
          <TabPanel id="logs">
            <VisorLogs />
          </TabPanel>
        </Tabs>
      </Card>

      <div className={styles.acciones!}>
        <Card>
          <h2>{t('respaldo.titulo')}</h2>
          <PrimaryButton size="small" onPress={() => setDialogo('exportar')}>
            {t('exportar_respaldo')}
          </PrimaryButton>
          <SecondaryButton onPress={() => setDialogo('importar')}>
            {t('importar_respaldo')}
          </SecondaryButton>
          <SecondaryButton onPress={() => setDialogo('liberar')}>
            {t('liberar_espacio')}
          </SecondaryButton>
        </Card>

        {onRestablecerApp ? (
          <Card>
            <h2>{t('acciones_mantenimiento')}</h2>
            <SecondaryButton onPress={() => setDialogo('restablecer')}>
              {t('restablecer_app')}
            </SecondaryButton>
          </Card>
        ) : null}
      </div>

      <ExportarRespaldoDialog abierto={dialogo === 'exportar'} db={db} onCerrar={cerrar} />
      <ImportarRespaldoDialog abierto={dialogo === 'importar'} db={db} onCerrar={cerrar} />
      <LiberarEspacioDialog abierto={dialogo === 'liberar'} db={db} onCerrar={cerrar} />
      {onRestablecerApp ? (
        <RestablecerAppDialog
          abierto={dialogo === 'restablecer'}
          onConfirmar={onRestablecerApp}
          onCerrar={cerrar}
        />
      ) : null}
    </div>
  );
}
