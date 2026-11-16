import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { esFinal } from '@/domain/estados';
import type { Rol, Servicio } from '@/domain/servicio';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import styles from './AccionesServicio.module.css';
import DialogoAnulacion from './DialogoAnulacion';

export interface AccionesServicioProps {
  servicio: Servicio;
  roles: readonly Rol[];
  onAnular: (motivo: string) => Promise<void>;
  onEditar: () => void;
}

/** Acciones de administración del servicio: anular y corregir datos (solo Administrador). */
export default function AccionesServicio({
  servicio,
  roles,
  onAnular,
  onEditar,
}: AccionesServicioProps) {
  const { t } = useTranslation('etapas');
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string>();

  const esAdmin = roles.includes('Administrador');
  const noEsBorrador = servicio.estado !== 'BORRADOR';
  const puedeAnular = esAdmin && noEsBorrador && !esFinal(servicio.estado);
  const puedeEditar = esAdmin && noEsBorrador;
  if (!puedeAnular && !puedeEditar) return null;

  const anular = async (motivo: string): Promise<void> => {
    setCargando(true);
    setError(undefined);
    try {
      await onAnular(motivo);
      setDialogoAbierto(false);
    } catch {
      setError(t('anulacion.error'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={styles['acciones-servicio']}>
      {puedeEditar ? (
        <SecondaryButton onPress={onEditar}>{t('anulacion.editar')}</SecondaryButton>
      ) : null}
      {puedeAnular ? (
        <SecondaryButton onPress={() => setDialogoAbierto(true)}>
          {t('anulacion.anular')}
        </SecondaryButton>
      ) : null}

      <DialogoAnulacion
        abierto={dialogoAbierto}
        cargando={cargando}
        error={error}
        onConfirmar={(motivo) => void anular(motivo)}
        onCancelar={() => {
          setError(undefined);
          setDialogoAbierto(false);
        }}
      />
    </div>
  );
}
