import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Servicio } from '@/domain/servicio';
import { importarRespaldo } from '@/application/respaldo/respaldo';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { Banner } from '@/shared/ui/Banner';

interface Props {
  readonly abierto: boolean;
  readonly serviciosExistentes: Servicio[];
  readonly onImportados: (servicios: Servicio[]) => void;
  readonly onCerrar: () => void;
}

export function ImportarRespaldoDialog({
  abierto,
  serviciosExistentes,
  onImportados,
  onCerrar,
}: Props): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const inputRef = useRef<HTMLInputElement>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files[0]) {
      setArchivo(files[0]);
      setError(null);
    }
  };

  const handleImportar = async () => {
    if (!archivo) {
      setError(t('respaldo.noArchivoSeleccionado'));
      return;
    }

    try {
      setCargando(true);
      setError(null);
      const resultado = await importarRespaldo(archivo, serviciosExistentes);

      if (resultado.servicios.length === 0 && resultado.omitidos.length > 0) {
        setError(t('respaldo.todosDuplicados'));
        return;
      }

      if (resultado.servicios.length > 0) {
        onImportados(resultado.servicios);
        onCerrar();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('respaldo.errorImportar'));
    } finally {
      setCargando(false);
    }
  };

  const handleCerrar = () => {
    setArchivo(null);
    setError(null);
    onCerrar();
  };

  return (
    <ResponsiveDialog
      titulo={t('respaldo.importarTitulo')}
      abierto={abierto}
      onCerrar={handleCerrar}
    >
      {error ? <Banner tipo="peligro">{error}</Banner> : null}

      <div style={{ marginBottom: 'var(--espacio-4)' }}>
        <p>{t('respaldo.importarDescripcion')}</p>

        <div
          style={{
            marginTop: 'var(--espacio-3)',
            padding: 'var(--espacio-3)',
            border: '2px dashed var(--color-borde)',
            borderRadius: 'var(--radio-2)',
            textAlign: 'center',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip,.json"
            onChange={handleSeleccionarArchivo}
            disabled={cargando}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={cargando}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primario)',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {t('respaldo.seleccionarArchivo')}
          </button>
          {archivo ? (
            <p style={{ marginTop: 'var(--espacio-2)', fontSize: 'var(--texto-pequeno)' }}>
              ✓ {archivo.name}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--espacio-3)', justifyContent: 'flex-end' }}>
        <SecondaryButton onPress={handleCerrar} isDisabled={cargando}>
          {t('comun.cancelar')}
        </SecondaryButton>
        <PrimaryButton onPress={handleImportar} isDisabled={cargando || !archivo}>
          {cargando ? t('respaldo.importando') : t('respaldo.importar')}
        </PrimaryButton>
      </div>
    </ResponsiveDialog>
  );
}
