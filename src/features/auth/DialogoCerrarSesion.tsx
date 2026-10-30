import { useTranslation } from 'react-i18next';

import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

interface Props {
  readonly abierto: boolean;
  readonly pendientes: number;
  readonly onConfirmar: () => void;
  readonly onCancelar: () => void;
}

export function DialogoCerrarSesion({
  abierto,
  pendientes,
  onConfirmar,
  onCancelar,
}: Props): React.JSX.Element {
  const { t } = useTranslation('auth');

  return (
    <ResponsiveDialog titulo={t('miCuenta.cerrarTitulo')} abierto={abierto} onCerrar={onCancelar}>
      {pendientes > 0 ? (
        <Banner tipo="advertencia">{t('miCuenta.pendientes', { count: pendientes })}</Banner>
      ) : null}
      <p>{t('miCuenta.confirmarCerrar')}</p>
      <div style={{ display: 'flex', gap: 'var(--espacio-3)', justifyContent: 'flex-end' }}>
        <SecondaryButton onPress={onCancelar}>{t('miCuenta.cancelar')}</SecondaryButton>
        <PrimaryButton onPress={onConfirmar}>{t('miCuenta.cerrarSesion')}</PrimaryButton>
      </div>
    </ResponsiveDialog>
  );
}
