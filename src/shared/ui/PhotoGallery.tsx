import { useTranslation } from 'react-i18next';
import type { Adjunto } from '@/domain/adjunto';
import { useObjectUrl } from '@/shared/hooks/useObjectUrl';
import { useOnline } from '@/shared/hooks/useOnline';
import { Icon } from '@/shared/ui/Icon';
import { SyncBadge } from '@/shared/ui/SyncBadge';

import styles from './PhotoGallery.module.css';

const ESTADO_SYNC: Record<Adjunto['syncState'], 'pendiente' | 'sincronizado' | 'error'> = {
  local: 'pendiente',
  pending: 'pendiente',
  syncing: 'pendiente',
  synced: 'sincronizado',
  error: 'error',
  conflict: 'error',
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
  const { t } = useTranslation(['servicios', 'adjuntos']);
  const enLinea = useOnline();
  // Archivo que solo está en SharePoint: sin contenido local, solo miniatura y enlace.
  const remoto = adjunto.blob === null && adjunto.sp !== undefined;
  const sync = {
    estado: ESTADO_SYNC[adjunto.syncState],
    texto: t(`servicios:sync.${adjunto.syncState}`),
  };

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
      {remoto && adjunto.sp ? (
        <div className={styles.remoto!}>
          <span className={styles.etiquetaRemoto!}>{t('adjuntos:remoto.badge')}</span>
          {enLinea ? (
            <a
              className={styles.enlace!}
              href={adjunto.sp.webUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('adjuntos:remoto.abrir')}
            </a>
          ) : (
            <span className={styles.enlaceInactivo!} aria-disabled="true">
              {t('adjuntos:remoto.sinRed')}
            </span>
          )}
        </div>
      ) : null}
      <figcaption className={styles.pie!}>
        <SyncBadge estado={sync.estado} etiqueta={sync.texto} />
        {onEliminar && !remoto ? (
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
