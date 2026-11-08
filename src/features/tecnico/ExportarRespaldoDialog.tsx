import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Servicio } from '@/domain/servicio';
import { exportarRespaldo } from '@/application/respaldo/respaldo';
import { compartirRespaldo } from '@/infrastructure/respaldo/compartir';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { Banner } from '@/shared/ui/Banner';

interface Props {
  readonly abierto: boolean;
  readonly servicios: Servicio[];
  readonly onCerrar: () => void;
}

export function ExportarRespaldoDialog({ abierto, servicios, onCerrar }: Props): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alcance, setAlcance] = useState<'solo-pendientes' | 'todos'>('solo-pendientes');

  const handleExportar = async () => {
    try {
      setCargando(true);
      setError(null);
      const resultado = await exportarRespaldo(servicios, alcance);

      // Intentar compartir via Web Share API, fallback a descarga
      await compartirRespaldo(resultado.blob, resultado.nombreArchivo);

      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('respaldo.errorExportar'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <ResponsiveDialog titulo={t('respaldo.exportarTitulo')} abierto={abierto} onCerrar={onCerrar}>
      {error ? <Banner tipo="peligro">{error}</Banner> : null}

      <div style={{ marginBottom: 'var(--espacio-4)' }}>
        <p>{t('respaldo.exportarDescripcion')}</p>

        <fieldset style={{ marginTop: 'var(--espacio-3)', border: 'none', padding: 0 }}>
          <legend style={{ marginBottom: 'var(--espacio-2)', fontWeight: 500 }}>
            {t('respaldo.alcance')}
          </legend>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--espacio-2)' }}>
            <input
              type="radio"
              name="alcance"
              value="solo-pendientes"
              checked={alcance === 'solo-pendientes'}
              onChange={(e) => setAlcance(e.target.value as 'solo-pendientes')}
              disabled={cargando}
            />
            {t('respaldo.soloPendientes')}
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--espacio-2)',
              marginTop: 'var(--espacio-2)',
            }}
          >
            <input
              type="radio"
              name="alcance"
              value="todos"
              checked={alcance === 'todos'}
              onChange={(e) => setAlcance(e.target.value as 'todos')}
              disabled={cargando}
            />
            {t('respaldo.todos')}
          </label>
        </fieldset>
      </div>

      <div style={{ display: 'flex', gap: 'var(--espacio-3)', justifyContent: 'flex-end' }}>
        <SecondaryButton onPress={onCerrar} isDisabled={cargando}>
          {t('comun.cancelar')}
        </SecondaryButton>
        <PrimaryButton onPress={handleExportar} isDisabled={cargando}>
          {cargando ? t('respaldo.exportando') : t('respaldo.descargarRespaldo')}
        </PrimaryButton>
      </div>
    </ResponsiveDialog>
  );
}
