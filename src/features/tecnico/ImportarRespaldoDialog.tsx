import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { importarRespaldo, type ResultadoImportar } from '@/application/respaldo/respaldo';
import type { AppDB } from '@/infrastructure/db/dexie';
import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import { depsRespaldo } from './respaldoDeps';
import styles from './RespaldoDialog.module.css';

interface Props {
  readonly abierto: boolean;
  readonly db: AppDB;
  readonly onImportados?: (resultado: ResultadoImportar) => void;
  readonly onCerrar: () => void;
}

/** Restaura un respaldo ZIP: guarda los servicios nuevos y omite los que ya existen (HU-009-1). */
export function ImportarRespaldoDialog({
  abierto,
  db,
  onImportados,
  onCerrar,
}: Props): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const deps = useMemo(() => depsRespaldo(db), [db]);
  const entrada = useRef<HTMLInputElement>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportar | null>(null);

  const importar = async (): Promise<void> => {
    if (!archivo) {
      setError(t('respaldo.noArchivoSeleccionado'));
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const importado = await importarRespaldo(deps.importar, archivo);
      if (importado.importados === 0 && importado.omitidos > 0) {
        setError(t('respaldo.todosDuplicados'));
        return;
      }
      setResultado(importado);
      onImportados?.(importado);
    } catch {
      setError(t('respaldo.errorImportar'));
    } finally {
      setCargando(false);
    }
  };

  const cerrar = (): void => {
    setArchivo(null);
    setError(null);
    setResultado(null);
    onCerrar();
  };

  return (
    <ResponsiveDialog titulo={t('respaldo.importarTitulo')} abierto={abierto} onCerrar={cerrar}>
      {error ? <Banner tipo="peligro">{error}</Banner> : null}
      {resultado ? (
        <Banner tipo="exito">
          {t('respaldo.resultadoImportar', {
            importados: resultado.importados,
            omitidos: resultado.omitidos,
          })}
        </Banner>
      ) : (
        <>
          <p>{t('respaldo.importarDescripcion')}</p>
          <input
            ref={entrada}
            type="file"
            accept=".zip,application/zip"
            className={styles.oculto!}
            data-testid="archivo-respaldo"
            disabled={cargando}
            onChange={(evento) => {
              setArchivo(evento.currentTarget.files?.[0] ?? null);
              setError(null);
            }}
          />
          <SecondaryButton onPress={() => entrada.current?.click()} isDisabled={cargando}>
            {archivo ? archivo.name : t('respaldo.seleccionarArchivo')}
          </SecondaryButton>
        </>
      )}
      <div className={styles.acciones!}>
        <SecondaryButton onPress={cerrar} isDisabled={cargando}>
          {resultado ? t('comun.cerrar') : t('comun.cancelar')}
        </SecondaryButton>
        {resultado ? null : (
          <PrimaryButton onPress={() => void importar()} isDisabled={cargando || !archivo}>
            {cargando ? t('respaldo.importando') : t('respaldo.importar')}
          </PrimaryButton>
        )}
      </div>
    </ResponsiveDialog>
  );
}
