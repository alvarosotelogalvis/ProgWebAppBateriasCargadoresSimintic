import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Servicio } from '@/domain/servicio';
import { useRoles } from '@/shared/hooks/useRoles';
import { esFinal } from '@/domain/estados';
import DialogoAnulacion from './DialogoAnulacion.tsx';
import styles from './AccionesServicio.module.css';

export interface AccionesServicioProps {
  servicio: Servicio;
  onAnular?: (motivo: string) => Promise<void>;
  onEditar?: () => void;
  cargando?: boolean;
}

export default function AccionesServicio({
  servicio,
  onAnular,
  onEditar,
  cargando = false,
}: AccionesServicioProps) {
  const { t } = useTranslation('etapas');
  const roles = useRoles();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  const esAdmin = roles.includes('Administrador');
  const esEstadoFinal = esFinal(servicio.estado);
  const puedeAnular = esAdmin && !esEstadoFinal && servicio.estado !== 'BORRADOR';
  const puedeEditar = esAdmin;

  const handleAnular = async (motivo: string) => {
    if (onAnular) {
      await onAnular(motivo);
      setDialogoAbierto(false);
    }
  };

  return (
    <div className={styles['acciones-servicio']}>
      {puedeAnular && (
        <button
          onClick={() => setDialogoAbierto(true)}
          className={styles['btn-anular']}
          disabled={cargando}
        >
          {t('anulacion.anular')}
        </button>
      )}

      {puedeEditar && esEstadoFinal && (
        <button onClick={onEditar} className={styles['btn-editar']} disabled={cargando}>
          {t('anulacion.editar')}
        </button>
      )}

      <DialogoAnulacion
        abierto={dialogoAbierto}
        cargando={cargando}
        onConfirmar={handleAnular}
        onCancelar={() => setDialogoAbierto(false)}
      />
    </div>
  );
}
