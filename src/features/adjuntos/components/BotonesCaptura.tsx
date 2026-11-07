import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/shared/ui/Icon';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import styles from './BotonesCaptura.module.css';

interface Props {
  readonly deshabilitado: boolean;
  readonly permitirWebcam: boolean;
  readonly onArchivos: (archivos: FileList | File[] | null) => void;
  readonly onWebcam: () => void;
}

export function BotonesCaptura({
  deshabilitado,
  permitirWebcam,
  onArchivos,
  onWebcam,
}: Props): React.JSX.Element {
  const { t } = useTranslation('adjuntos');
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.botones!}>
      <SecondaryButton isDisabled={deshabilitado} onPress={() => camara.current?.click()}>
        <Icon nombre="camara" tamano={20} />
        {t('tomarFoto')}
      </SecondaryButton>
      <SecondaryButton isDisabled={deshabilitado} onPress={() => galeria.current?.click()}>
        <Icon nombre="imagen" tamano={20} />
        {t('galeria')}
      </SecondaryButton>
      {permitirWebcam ? (
        <SecondaryButton isDisabled={deshabilitado} onPress={onWebcam}>
          <Icon nombre="computador" tamano={20} />
          {t('webcam')}
        </SecondaryButton>
      ) : null}

      <input
        ref={camara}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(evento) => {
          onArchivos(evento.target.files);
          evento.target.value = '';
        }}
      />
      <input
        ref={galeria}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(evento) => {
          onArchivos(evento.target.files);
          evento.target.value = '';
        }}
      />
    </div>
  );
}
