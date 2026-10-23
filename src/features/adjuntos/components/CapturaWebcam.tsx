import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import styles from './CapturaWebcam.module.css';

interface Props {
  readonly abierto: boolean;
  readonly onCerrar: () => void;
  readonly onCapturar: (archivo: File) => void;
}

export function CapturaWebcam({ abierto, onCerrar, onCapturar }: Props): React.JSX.Element {
  const { t } = useTranslation('adjuntos');
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | undefined>(undefined);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;

    const iniciar = async (): Promise<void> => {
      try {
        const medio = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (!vigente) {
          medio.getTracks().forEach((pista) => pista.stop());
          return;
        }
        stream.current = medio;
        if (video.current) {
          video.current.srcObject = medio;
          await video.current.play().catch(() => undefined);
        }
      } catch {
        if (vigente) setError(t('error.camara'));
      }
    };

    void iniciar();

    return () => {
      vigente = false;
      stream.current?.getTracks().forEach((pista) => pista.stop());
      stream.current = undefined;
    };
  }, [abierto, t]);

  const capturar = (): void => {
    const elemento = video.current;
    if (!elemento || !elemento.videoWidth) return;
    const lienzo = document.createElement('canvas');
    lienzo.width = elemento.videoWidth;
    lienzo.height = elemento.videoHeight;
    const contexto = lienzo.getContext('2d');
    if (!contexto) return;
    contexto.drawImage(elemento, 0, 0);
    lienzo.toBlob(
      (blob) => {
        if (!blob) return;
        onCapturar(new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        onCerrar();
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <ResponsiveDialog titulo={t('webcam')} abierto={abierto} onCerrar={onCerrar}>
      {error ? <Banner tipo="peligro">{error}</Banner> : null}
      <video ref={video} playsInline muted className={styles.video!} />
      <div className={styles.acciones!}>
        <SecondaryButton onPress={onCerrar}>{t('comun:cancelar', 'Cancelar')}</SecondaryButton>
        <PrimaryButton onPress={capturar} isDisabled={Boolean(error)}>
          {t('tomarFoto')}
        </PrimaryButton>
      </div>
    </ResponsiveDialog>
  );
}
