import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/containerContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useRoles } from '@/shared/hooks/useRoles';
import DialogoAnulacion from '../components/DialogoAnulacion';

export function EtapaAnulacionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const container = useContainer();
  const roles = useRoles();
  const { t } = useTranslation(['etapas', 'servicios']);

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  const servicio = useLiveQuery(async () => {
    if (!id) return undefined;
    return container.db.servicios.get(id);
  }, [id, container.db]);

  if (!servicio) return <div>{t('servicios:cargando')}</div>;

  const esAdmin = roles.includes('Administrador');
  const puedeAnular = esAdmin && servicio.estado !== 'BORRADOR';

  const handleAnular = async (motivo: string) => {
    if (!puedeAnular) return;

    setCargando(true);
    try {
      const actualizado = {
        ...servicio,
        estado: 'ANULADO' as const,
        anulacionMotivo: motivo,
        anulacionFecha: new Date().toISOString().split('T')[0],
        actualizadoEn: new Date().toISOString(),
        syncState: 'pending' as const,
      };
      await container.db.servicios.put(actualizado);
      setDialogoAbierto(false);
      navigate(`/servicios/${id}`);
    } catch (error) {
      console.error('Error al anular:', error);
    } finally {
      setCargando(false);
    }
  };

  if (!puedeAnular) {
    return (
      <div className="etapa-anulacion">
        <p>{t('anulacion.error_permisos')}</p>
        <button onClick={() => navigate(`/servicios/${id}`)}>{t('etapas:cancelar')}</button>
      </div>
    );
  }

  return (
    <div className="etapa-anulacion">
      <h2>{t('anulacion.titulo')}</h2>
      <p className="subtitulo">{t('anulacion.subtitulo')}</p>

      <button onClick={() => setDialogoAbierto(true)} className="btn-anular" disabled={cargando}>
        {t('anulacion.anular')}
      </button>

      <button onClick={() => navigate(`/servicios/${id}`)} className="btn-cancelar">
        {t('etapas:cancelar')}
      </button>

      <DialogoAnulacion
        abierto={dialogoAbierto}
        cargando={cargando}
        onConfirmar={handleAnular}
        onCancelar={() => setDialogoAbierto(false)}
      />
    </div>
  );
}
