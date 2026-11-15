import { useTranslation } from 'react-i18next';

import type { Servicio } from '@/domain/servicio';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';

import { etiquetaCampo } from '../etiquetasCampos';
import styles from './ListaConflictos.module.css';

interface ListaConflictosProps {
  readonly servicios: readonly Servicio[];
  readonly onAbrir: (servicioId: string) => void;
}

/** Servicios en conflicto, en la pestaña «Conflictos» de Sincronización. */
export function ListaConflictos({ servicios, onAbrir }: ListaConflictosProps): React.JSX.Element {
  const { t } = useTranslation('sync');
  const conConflictos = servicios.filter((servicio) => servicio.syncState === 'conflict');

  if (conConflictos.length === 0) {
    return <EmptyState titulo={t('conflictos.sinConflictos')} icono="verificado" />;
  }

  return (
    <ul className={styles.lista!}>
      {conConflictos.map((servicio) => (
        <li key={servicio.id}>
          <ListRow
            icono="advertencia"
            etiqueta={servicio.codigo}
            descripcion={t('conflictos.banner.mensaje', {
              count: servicio.conflictos.length,
              campos: servicio.conflictos
                .map((conflicto) => etiquetaCampo(t, conflicto.campo))
                .join(', '),
            })}
            onClick={() => onAbrir(servicio.id)}
          />
        </li>
      ))}
    </ul>
  );
}
