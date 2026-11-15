import { useMemo, useState } from 'react';
import { Radio, RadioGroup } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { exportarRespaldo, type AlcanceRespaldo } from '@/application/respaldo/respaldo';
import type { AppDB } from '@/infrastructure/db/dexie';
import { compartirRespaldo } from '@/infrastructure/respaldo/compartir';
import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import { depsRespaldo } from './respaldoDeps';
import styles from './RespaldoDialog.module.css';

interface Props {
  readonly abierto: boolean;
  readonly db: AppDB;
  readonly onCerrar: () => void;
}

/** Exporta un ZIP con los servicios, sus datos completos y los archivos locales (HU-009-1). */
export function ExportarRespaldoDialog({ abierto, db, onCerrar }: Props): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const deps = useMemo(() => depsRespaldo(db), [db]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alcance, setAlcance] = useState<AlcanceRespaldo>('solo-pendientes');

  const exportar = async (): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await exportarRespaldo(deps.exportar, alcance);
      // Web Share en celulares; en escritorio se descarga.
      const salida = await compartirRespaldo(resultado.blob, resultado.nombreArchivo);
      if (salida !== 'cancelado') onCerrar();
    } catch {
      setError(t('respaldo.errorExportar'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <ResponsiveDialog titulo={t('respaldo.exportarTitulo')} abierto={abierto} onCerrar={onCerrar}>
      {error ? <Banner tipo="peligro">{error}</Banner> : null}
      <p>{t('respaldo.exportarDescripcion')}</p>
      <RadioGroup
        className={styles.grupo!}
        aria-label={t('respaldo.alcance')}
        value={alcance}
        onChange={(valor) => setAlcance(valor as AlcanceRespaldo)}
        isDisabled={cargando}
      >
        <Radio value="solo-pendientes" className={styles.opcion!}>
          {t('respaldo.soloPendientes')}
        </Radio>
        <Radio value="todos" className={styles.opcion!}>
          {t('respaldo.todos')}
        </Radio>
      </RadioGroup>
      <div className={styles.acciones!}>
        <SecondaryButton onPress={onCerrar} isDisabled={cargando}>
          {t('comun.cancelar')}
        </SecondaryButton>
        <PrimaryButton onPress={() => void exportar()} isDisabled={cargando}>
          {cargando ? t('respaldo.exportando') : t('respaldo.descargarRespaldo')}
        </PrimaryButton>
      </div>
    </ResponsiveDialog>
  );
}
