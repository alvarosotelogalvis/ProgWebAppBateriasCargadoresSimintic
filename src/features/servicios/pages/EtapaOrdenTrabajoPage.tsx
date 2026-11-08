import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/containerContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import CampoMoneda from '../components/CampoMoneda';

export function EtapaOrdenTrabajoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const container = useContainer();
  const { t } = useTranslation(['etapas', 'servicios']);

  const [cambios, setCambios] = useState<Record<string, unknown>>({});

  const servicio = useLiveQuery(async () => {
    if (!id) return undefined;
    return container.db.servicios.get(id);
  }, [id, container.db]);

  if (!servicio) return <div>{t('servicios:cargando')}</div>;

  const detalle = (cambios.otDetalle as string) ?? servicio.otDetalle ?? '';
  const costo = (cambios.otCostoReparacion as number) ?? servicio.otCostoReparacion ?? 0;
  const cotizacionAprobada = servicio.cotizacionEstado === 'APROBADA';
  const detalleValido = detalle.trim().length >= 5;

  const handleCompletarOT = async () => {
    navigate(`/servicios/${id}`);
  };

  return (
    <div className="etapa-orden-trabajo">
      <h2>{t('ordenTrabajo.titulo')}</h2>
      <p className="subtitulo">{t('ordenTrabajo.subtitulo')}</p>

      {!cotizacionAprobada && (
        <div className="advertencia-estado">
          <p>{t('ordenTrabajo.esperandoRespuesta')}</p>
        </div>
      )}

      {cotizacionAprobada && (
        <div className="form">
          <div className="campo-detalle">
            <label htmlFor="detalle">{t('ordenTrabajo.detalle')}</label>
            <textarea
              id="detalle"
              value={detalle}
              onChange={(e) => setCambios({ ...cambios, otDetalle: e.target.value })}
              placeholder={t('ordenTrabajo.detalleAyuda')}
              rows={6}
              disabled={!cotizacionAprobada}
            />
            <small>{t('ordenTrabajo.detalleAyuda')}</small>
          </div>

          <CampoMoneda
            label={t('ordenTrabajo.costo')}
            valor={costo}
            onChange={(v) => setCambios({ ...cambios, otCostoReparacion: v })}
            requerido={true}
            helpText={t('ordenTrabajo.costoAyuda')}
          />

          <div className="acciones">
            <button
              onClick={handleCompletarOT}
              className="btn-completar"
              disabled={!detalleValido || costo < 0}
            >
              {t('ordenTrabajo.completar')}
            </button>
            <button onClick={() => navigate(`/servicios/${id}`)} className="btn-cancelar">
              {t('etapas:cancelar')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
