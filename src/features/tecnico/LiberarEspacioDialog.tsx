import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppDB } from '@/infrastructure/db/dexie';
import { ejecutarPurgas } from '@/application/purgas/ejecutarPurgas';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { Banner } from '@/shared/ui/Banner';

interface Props {
  readonly abierto: boolean;
  readonly db: AppDB;
  readonly onCerrar: () => void;
  readonly onPurgado?: (espacioLiberado: number) => void;
}

export function LiberarEspacioDialog({
  abierto,
  db,
  onCerrar,
  onPurgado,
}: Props): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    serviciosPurgados: number;
    adjuntosPurgados: number;
    espacioLiberado: number;
  } | null>(null);

  const handleLiberar = async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await ejecutarPurgas(db);

      setResultado({
        serviciosPurgados: res.serviciosPurgados.length,
        adjuntosPurgados: res.adjuntosPurgados.length,
        espacioLiberado: res.espacioLiberado,
      });

      onPurgado?.(res.espacioLiberado);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('respaldo.errorExportar'));
    } finally {
      setCargando(false);
    }
  };

  const handleCerrar = () => {
    setResultado(null);
    setError(null);
    onCerrar();
  };

  return (
    <ResponsiveDialog
      titulo={t('tecnico.liberar_espacio')}
      abierto={abierto}
      onCerrar={handleCerrar}
    >
      {error ? <Banner tipo="peligro">{error}</Banner> : null}

      {resultado ? (
        <Banner tipo="exito">
          {t('respaldo.liberado')}: {Math.round(resultado.espacioLiberado / 1024 / 1024)} MB
        </Banner>
      ) : null}

      <div style={{ marginBottom: 'var(--espacio-4)' }}>
        <p>{t('respaldo.limpiarAdvertencia')}</p>

        {resultado && (
          <ul style={{ marginTop: 'var(--espacio-3)', paddingLeft: 'var(--espacio-3)' }}>
            <li>
              {t('respaldo.serviciosPurgados')}: {resultado.serviciosPurgados}
            </li>
            <li>
              {t('respaldo.adjuntosPurgados')}: {resultado.adjuntosPurgados}
            </li>
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--espacio-3)', justifyContent: 'flex-end' }}>
        <SecondaryButton onPress={handleCerrar} isDisabled={cargando}>
          {resultado ? t('comun.cerrar') : t('comun.cancelar')}
        </SecondaryButton>
        {!resultado ? (
          <PrimaryButton onPress={handleLiberar} isDisabled={cargando}>
            {cargando ? t('respaldo.purgando') : t('tecnico.liberar_espacio')}
          </PrimaryButton>
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
