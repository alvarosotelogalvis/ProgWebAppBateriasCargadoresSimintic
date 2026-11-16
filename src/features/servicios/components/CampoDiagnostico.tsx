import { useContainer } from '@/app/containerContext';
import { claveChoice } from '@/application/setup/claves';
import { useCatalogo } from '@/infrastructure/db/hooks';
import { useTranslation } from 'react-i18next';
import styles from './CampoDiagnostico.module.css';

export interface CampoDiagnosticoProps {
  valor?: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
}

export default function CampoDiagnostico({
  valor,
  onChange,
  disabled = false,
}: CampoDiagnosticoProps) {
  const { t } = useTranslation('etapas');
  const container = useContainer();

  // Obtener catálogo de diagnósticos desde configuración
  const diagnosticos =
    useCatalogo<readonly string[]>(claveChoice('Diagnostico'), container.db) ?? [];

  const valorActualExiste = diagnosticos.includes(valor ?? '');
  const mostrarValorAnterior = !valorActualExiste && valor;

  return (
    <div className={styles['campo-diagnostico']}>
      <label htmlFor="diagnostico">{t('diagnostico.campo')}</label>

      <select
        id="diagnostico"
        value={valor || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-describedby="diagnostico-ayuda"
      >
        <option value="">{t('diagnostico.buscar')}</option>

        {diagnosticos.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}

        {mostrarValorAnterior && (
          <option value={valor} disabled>
            {valor} {t('diagnostico.valorAnterior')}
          </option>
        )}
      </select>

      <small id="diagnostico-ayuda">{t('diagnostico.buscar')}</small>

      {mostrarValorAnterior && (
        <div className={styles.advertencia}>{t('diagnostico.valorAnterior')}</div>
      )}
    </div>
  );
}
