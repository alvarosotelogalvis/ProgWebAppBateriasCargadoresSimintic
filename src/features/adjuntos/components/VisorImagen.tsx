import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { Adjunto } from '@/domain/adjunto';
import { useObjectUrl } from '@/shared/hooks/useObjectUrl';
import { Icon } from '@/shared/ui/Icon';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import styles from './VisorImagen.module.css';

interface Props {
  readonly adjuntos: readonly Adjunto[];
  readonly indice: number | undefined;
  readonly onCambiarIndice: (indice: number) => void;
  readonly onCerrar: () => void;
}

export function VisorImagen({
  adjuntos,
  indice,
  onCambiarIndice,
  onCerrar,
}: Props): React.JSX.Element {
  const { t } = useTranslation('adjuntos');
  const actual = indice === undefined ? undefined : adjuntos[indice];
  const url = useObjectUrl(actual?.blob ?? null);
  const hayAnterior = indice !== undefined && indice > 0;
  const haySiguiente = indice !== undefined && indice < adjuntos.length - 1;

  useEffect(() => {
    if (indice === undefined) return;
    const manejar = (evento: KeyboardEvent): void => {
      if (evento.key === 'ArrowLeft' && hayAnterior) onCambiarIndice(indice - 1);
      if (evento.key === 'ArrowRight' && haySiguiente) onCambiarIndice(indice + 1);
    };
    window.addEventListener('keydown', manejar);
    return () => window.removeEventListener('keydown', manejar);
  }, [indice, hayAnterior, haySiguiente, onCambiarIndice]);

  return (
    <ResponsiveDialog titulo={t('ver')} abierto={indice !== undefined} onCerrar={onCerrar}>
      {url ? <img className={styles.imagen!} src={url} alt={actual?.nombreArchivo ?? ''} /> : null}
      <div className={styles.acciones!}>
        <SecondaryButton
          isDisabled={!hayAnterior}
          onPress={() => onCambiarIndice((indice ?? 0) - 1)}
        >
          <Icon nombre="chevronIzquierda" tamano={20} />
          {t('anterior')}
        </SecondaryButton>
        <SecondaryButton
          isDisabled={!haySiguiente}
          onPress={() => onCambiarIndice((indice ?? 0) + 1)}
        >
          {t('siguiente')}
          <Icon nombre="chevronDerecha" tamano={20} />
        </SecondaryButton>
      </div>
    </ResponsiveDialog>
  );
}
