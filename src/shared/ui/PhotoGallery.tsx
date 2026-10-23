import type { Adjunto } from '@/domain/adjunto';
import { useObjectUrl } from '@/shared/hooks/useObjectUrl';
import { Icon } from '@/shared/ui/Icon';
import { SyncBadge } from '@/shared/ui/SyncBadge';

import styles from './PhotoGallery.module.css';

const ETIQUETA_SYNC: Record<
  Adjunto['syncState'],
  { estado: 'pendiente' | 'sincronizado' | 'error'; texto: string }
> = {
  local: { estado: 'pendiente', texto: 'Local' },
  pending: { estado: 'pendiente', texto: 'Pendiente' },
  syncing: { estado: 'pendiente', texto: 'Sincronizando' },
  synced: { estado: 'sincronizado', texto: 'Sincronizado' },
  error: { estado: 'error', texto: 'Error' },
  conflict: { estado: 'error', texto: 'Conflicto' },
};

function PhotoTile({
  adjunto,
  onVer,
  onEliminar,
}: {
  readonly adjunto: Adjunto;
  readonly onVer?: ((adjunto: Adjunto) => void) | undefined;
  readonly onEliminar?: ((adjunto: Adjunto) => void) | undefined;
}): React.JSX.Element {
  const url = useObjectUrl(adjunto.miniatura ?? adjunto.blob);
  const sync = ETIQUETA_SYNC[adjunto.syncState];

  return (
    <figure className={styles.ficha!}>
      <button
        type="button"
        className={styles.miniatura!}
        onClick={() => onVer?.(adjunto)}
        aria-label={`Ver ${adjunto.nombreArchivo}`}
      >
        {url ? <img src={url} alt="" /> : <Icon nombre="imagen" tamano={28} />}
      </button>
      <figcaption className={styles.pie!}>
        <SyncBadge estado={sync.estado} etiqueta={sync.texto} />
        {onEliminar ? (
          <button
            type="button"
            className={styles.eliminar!}
            onClick={() => onEliminar(adjunto)}
            aria-label={`Eliminar ${adjunto.nombreArchivo}`}
          >
            <Icon nombre="eliminar" tamano={20} />
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}

interface Props {
  readonly adjuntos: readonly Adjunto[];
  readonly onVer?: ((adjunto: Adjunto) => void) | undefined;
  readonly onEliminar?: ((adjunto: Adjunto) => void) | undefined;
}

export function PhotoGallery({ adjuntos, onVer, onEliminar }: Props): React.JSX.Element {
  return (
    <ul className={styles.galeria!}>
      {adjuntos.map((adjunto) => (
        <li key={adjunto.id}>
          <PhotoTile adjunto={adjunto} onVer={onVer} onEliminar={onEliminar} />
        </li>
      ))}
    </ul>
  );
}
