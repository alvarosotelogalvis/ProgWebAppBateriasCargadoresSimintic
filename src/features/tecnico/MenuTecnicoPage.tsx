import { useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { reintentarErrores } from '@/application/mantenimiento/reintentarErrores';
import { useDb } from '@/shared/hooks/useDb';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import { depsMantenimiento } from './depsMantenimiento';
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
  const navegar = useNavigate();
  const [dialogo, setDialogo] = useState<DialogoAbierto>(null);
  const cerrar = (): void => setDialogo(null);
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'peligro'; texto: string } | null>(null);

  const reintentar = async (): Promise<void> => {
    try {
      const { reintentados } = await reintentarErrores(depsMantenimiento(db).reintentar);
      setAviso({
        tipo: 'exito',
        texto:
          reintentados.length === 0
            ? t('reintentar_errores_ninguno')
            : t('reintentar_errores_resultado', { count: reintentados.length }),
      });
    } catch {
      setAviso({ tipo: 'peligro', texto: t('reintentar_errores_fallo') });
    }
  };

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

        <Card>
          <h2>{t('clientes.titulo')}</h2>
          <SecondaryButton onPress={() => navegar('/tecnico/clientes')}>
            {t('clientes.titulo')}
          </SecondaryButton>
        </Card>

        <Card>
          <h2>{t('acciones_mantenimiento')}</h2>
          {aviso ? <Banner tipo={aviso.tipo}>{aviso.texto}</Banner> : null}
          <SecondaryButton onPress={() => void reintentar()}>
            {t('reintentar_errores')}
          </SecondaryButton>
          {onRestablecerApp ? (
            <SecondaryButton onPress={() => setDialogo('restablecer')}>
              {t('restablecer_app')}
            </SecondaryButton>
          ) : null}
        </Card>
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
