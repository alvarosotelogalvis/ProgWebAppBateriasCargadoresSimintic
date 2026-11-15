import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorRestablecimiento } from '@/application/mantenimiento/restablecerApp';
import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { TextField } from '@/shared/ui/TextField';

import styles from './RespaldoDialog.module.css';

const PALABRA = 'BORRAR';

interface Props {
  readonly abierto: boolean;
  readonly onConfirmar: () => Promise<void>;
  readonly onCerrar: () => void;
}

/** Restablecer borra los datos locales: pide escribir BORRAR y se niega si hay algo sin sincronizar. */
export function RestablecerAppDialog({ abierto, onConfirmar, onCerrar }: Props): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const confirmar = async (): Promise<void> => {
    setProcesando(true);
    setError(null);
    try {
      await onConfirmar();
    } catch (causa) {
      setError(
        causa instanceof ErrorRestablecimiento
          ? t('pendientes_sin_respaldo')
          : t('error_restablecer')
      );
    } finally {
      setProcesando(false);
    }
  };

  const cerrar = (): void => {
    setTexto('');
    setError(null);
    onCerrar();
  };

  return (
    <ResponsiveDialog titulo={t('restablecer_app')} abierto={abierto} onCerrar={cerrar}>
      {error ? <Banner tipo="peligro">{error}</Banner> : null}
      <p>{t('restablecer_descripcion')}</p>
      <TextField
        etiqueta={t('confirmar_restablecimiento')}
        value={texto}
        onChange={setTexto}
        isDisabled={procesando}
        autoCapitalize="characters"
      />
      <div className={styles.acciones!}>
        <SecondaryButton onPress={cerrar} isDisabled={procesando}>
          {t('comun.cancelar')}
        </SecondaryButton>
        <PrimaryButton
          onPress={() => void confirmar()}
          isDisabled={procesando || texto.trim() !== PALABRA}
        >
          {t('restablecer_app')}
        </PrimaryButton>
      </div>
    </ResponsiveDialog>
  );
}
