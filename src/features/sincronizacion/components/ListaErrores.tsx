import { useTranslation } from 'react-i18next';

import type { ItemColaSync } from '@/infrastructure/db/hooks';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { SyncBadge, type EstadoSync } from '@/shared/ui/SyncBadge';

import styles from './ListaCola.module.css';

interface Props {
  readonly items: readonly ItemColaSync[];
  readonly vacio: string;
  /** Si se pasa, cada fila con error muestra "REINTENTAR". */
  readonly onReintentar?: (servicioId: string) => void;
}

const estadoBadge = (item: ItemColaSync): EstadoSync =>
  item.syncState === 'error' || item.syncState === 'conflict' ? 'error' : 'pendiente';

/**
 * Filas de la cola con el punto de color de su estado de sync. Para los errores,
 * muestra el mensaje según el código y la acción "REINTENTAR" (ES-005-17).
 */
export function ListaErrores({ items, vacio, onReintentar }: Props): React.JSX.Element {
  const { t } = useTranslation(['sync', 'errores']);

  if (items.length === 0) {
    return <p className={styles.vacio!}>{vacio}</p>;
  }

  const etiquetaEstado = (item: ItemColaSync): string => {
    if (item.syncState === 'error') return t('sync:estados.error');
    if (item.syncState === 'conflict') return t('sync:estados.conflicto');
    return t('sync:estados.enCola');
  };

  const mensaje = (item: ItemColaSync): string | null => {
    if (item.syncState === 'conflict') return t('sync:cola.conflictoDetalle');
    if (!item.ultimoError) return null;
    return t(`errores:codigo.${item.ultimoError.codigo}`, {
      defaultValue: item.ultimoError.mensaje,
    });
  };

  return (
    <ul className={styles.lista!}>
      {items.map((item) => {
        const texto = mensaje(item);
        return (
          <li key={item.id} className={styles.fila!}>
            <div className={styles.textos!}>
              <span className={styles.codigo!}>{item.codigo}</span>
              {item.descripcion ? (
                <span className={styles.descripcion!}>{item.descripcion}</span>
              ) : null}
              {texto ? <span className={styles.mensaje!}>{texto}</span> : null}
              {item.syncState === 'error' && item.intentos > 0 ? (
                <span className={styles.descripcion!}>
                  {t('sync:cola.intentos', { count: item.intentos })}
                </span>
              ) : null}
            </div>
            <div className={styles.acciones!}>
              <SyncBadge estado={estadoBadge(item)} etiqueta={etiquetaEstado(item)} />
              {onReintentar && item.syncState === 'error' ? (
                <SecondaryButton
                  aria-label={t('sync:cola.reintentarServicio', { codigo: item.codigo })}
                  onPress={() => onReintentar(item.id)}
                >
                  {t('sync:cola.reintentar')}
                </SecondaryButton>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
