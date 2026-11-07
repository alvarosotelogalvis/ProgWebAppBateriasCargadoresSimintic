import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Servicio, Rol, AccionEtapa } from '@/domain/servicio';
import { useTranslation } from 'react-i18next';
import { camposEditables, rolesTransicionSiguiente } from '@/domain/estados';

export interface FormEtapaProps {
  servicio: Servicio;
  etapa: string;
  roles: readonly Rol[];
  onComplete: (accion: AccionEtapa) => void;
}

export default function FormEtapa({ servicio, etapa, roles, onComplete }: FormEtapaProps) {
  const { t } = useTranslation('etapas');
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const editables = camposEditables(servicio, roles);
  const rolesSiguientes = rolesTransicionSiguiente(servicio.estado);
  const puedeEditar = roles.some((rol) => rolesSiguientes.includes(rol));

  // Obtener la etiqueta de "Pendiente de <rol>"
  let pendienteDe: string | null = null;
  if (!puedeEditar && rolesSiguientes.length > 0) {
    const rolesText = rolesSiguientes.map((r) => t(`roles.${r}`)).join(', ');
    pendienteDe = t('pendiente', { rol: rolesText });
  }

  const handleCancel = () => {
    navigate(`/servicios/${servicio.id}`);
  };

  const handleComplete = async () => {
    setPending(true);
    try {
      // stub: completará cuando se integre con el caso de uso
      onComplete('completarDiagnostico');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="form-etapa">
      <h2>{t(`${etapa}.titulo`)}</h2>
      <p className="subtitulo">{t(`${etapa}.subtitulo`)}</p>

      {pendienteDe && <div className="banner-pendiente">{pendienteDe}</div>}

      {!puedeEditar && editables.size === 0 && <div className="empty-state">{t('sinPermiso')}</div>}

      {puedeEditar && (
        <>
          <div className="campos">{/* Los campos específicos se renderizarán aquí */}</div>

          <div className="acciones">
            <button onClick={handleComplete} disabled={pending} className="btn-primary">
              {pending ? t('guardando') : t(`${etapa}.completar`)}
            </button>
            <button onClick={handleCancel} className="btn-secondary">
              {t('cancelar')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
