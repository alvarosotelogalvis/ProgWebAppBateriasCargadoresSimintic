import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { TextField } from '@/shared/ui/TextField';
import styles from './DialogoAnulacion.module.css';

export const MOTIVO_MINIMO = 10;

export interface DialogoAnulacionProps {
  abierto: boolean;
  cargando?: boolean;
  error?: string | undefined;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}

/** Confirmación de anulación: exige un motivo de al menos 10 caracteres (ES-007-26). */
export default function DialogoAnulacion({
  abierto,
  cargando = false,
  error,
  onConfirmar,
  onCancelar,
}: DialogoAnulacionProps) {
  const { t } = useTranslation('etapas');
  const [motivo, setMotivo] = useState('');
  const motivoValido = motivo.trim().length >= MOTIVO_MINIMO;

  const cancelar = (): void => {
    setMotivo('');
    onCancelar();
  };

  return (
    <ResponsiveDialog titulo={t('anulacion.confirmarTitulo')} abierto={abierto} onCerrar={cancelar}>
      <div className={styles.contenido!}>
        <p>{t('anulacion.confirmarTexto')}</p>
        <TextField
          id="motivo-anulacion"
          etiqueta={t('anulacion.motivo')}
          ayuda={t('anulacion.motivoAyuda')}
          multilinea
          value={motivo}
          onChange={setMotivo}
        />
        {error ? <Banner tipo="peligro">{error}</Banner> : null}
        <div className={styles.acciones!}>
          <SecondaryButton onPress={cancelar} isDisabled={cargando}>
            {t('cancelar')}
          </SecondaryButton>
          <PrimaryButton
            isDisabled={!motivoValido || cargando}
            onPress={() => {
              onConfirmar(motivo.trim());
              setMotivo('');
            }}
          >
            {t('anulacion.confirmar')}
          </PrimaryButton>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
