import { useTranslation } from 'react-i18next';

import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import styles from './RespaldoDialog.module.css';

interface Props {
  readonly abierto: boolean;
  readonly origen: string;
  readonly destino: string;
  readonly procesando: boolean;
  readonly avance: { readonly hechos: number; readonly total: number } | null;
  readonly onConfirmar: () => void;
  readonly onCerrar: () => void;
}

/** Confirmación de la fusión: dice qué se fusiona en qué y muestra el avance mientras reasigna. */
export function FusionarClientesDialog({
  abierto,
  origen,
  destino,
  procesando,
  avance,
  onConfirmar,
  onCerrar,
}: Props): React.JSX.Element {
  const { t } = useTranslation('tecnico');

  return (
    <ResponsiveDialog titulo={t('clientes.confirmar_titulo')} abierto={abierto} onCerrar={onCerrar}>
      <p>{t('clientes.confirmar_texto', { origen, destino })}</p>
      {procesando && avance ? (
        <p role="status">{t('clientes.avance', { hechos: avance.hechos, total: avance.total })}</p>
      ) : null}
      <div className={styles.acciones!}>
        <SecondaryButton onPress={onCerrar} isDisabled={procesando}>
          {t('clientes.cancelar')}
        </SecondaryButton>
        <PrimaryButton onPress={onConfirmar} isDisabled={procesando}>
          {t('clientes.confirmar')}
        </PrimaryButton>
      </div>
    </ResponsiveDialog>
  );
}
