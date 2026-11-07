import { useTranslation } from 'react-i18next';
import type { Servicio } from '@/domain/servicio';

/**
 * Lista de servicios con conflictos en la pestaña "Conflictos" de Sincronización
 * ListRow para cada servicio
 * T-021
 */

interface ListaConflictosProps {
  readonly servicios: readonly Servicio[];
  readonly onAbrir: (servicioId: string) => void;
}

export function ListaConflictos({ servicios, onAbrir }: ListaConflictosProps) {
  const { t } = useTranslation('sync');
  const conConflictos = servicios.filter((s) => s.syncState === 'conflict');

  if (conConflictos.length === 0) {
    return <p>{t('conflictos.sinConflictos')}</p>;
  }

  return (
    <ul>
      {conConflictos.map((servicio) => (
        <li key={servicio.id}>
          <button type="button" onClick={() => onAbrir(servicio.id)}>
            <h3>{servicio.codigo}</h3>
            <p>
              {t('conflictos.banner.mensaje', {
                count: servicio.conflictos.length,
                campos: servicio.conflictos.map((c) => c.campo).join(', '),
              })}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
