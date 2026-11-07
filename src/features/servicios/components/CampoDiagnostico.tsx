import { useContainer } from '@/app/containerContext';
import { useLiveQuery } from 'dexie-react-hooks';
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
  const diagnosticos = useLiveQuery(async () => {
    const catalogo = await container.db.catalogos.where('id').equals('choices:Diagnostico').first();

    return catalogo?.valores ?? [];
  }, [container.db]);

  const valorActualExiste = diagnosticos?.some((d) => d.valor === valor);
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

        {diagnosticos?.map((d) => (
          <option key={d.valor} value={d.valor}>
            {d.etiqueta}
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
