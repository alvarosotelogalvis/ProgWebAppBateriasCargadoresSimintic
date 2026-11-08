import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/containerContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { cambiarRespuestaCotizacion } from '@/application/servicios/cambiarRespuestaCotizacion';
import { useRoles } from '@/shared/hooks/useRoles';
import CampoMoneda from '../components/CampoMoneda';
import AdjuntoPdf from '@/features/adjuntos/components/AdjuntoPdf';

export function EtapaCotizacionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const container = useContainer();
  const roles = useRoles();
  const { t } = useTranslation(['etapas', 'servicios']);

  const [cambios, setCambios] = useState<Record<string, unknown>>({});

  const servicio = useLiveQuery(async () => {
    if (!id) return undefined;
    return container.db.servicios.get(id);
  }, [id, container.db]);

  const adjuntos = useLiveQuery(async () => {
    if (!servicio) return [];
    return container.db.adjuntos
      .where('servicioId')
      .equals(servicio.id)
      .filter((a) => a.tipo === 'COTIZACION')
      .toArray();
  }, [servicio, container.db]);

  if (!servicio) return <div>{t('servicios:cargando')}</div>;

  const fechaEnvio = (cambios.cotizacionFechaEnvio as string) ?? servicio.cotizacionFechaEnvio;
  const valor = (cambios.cotizacionValor as number) ?? servicio.cotizacionValor ?? 0;
  const estadoActual =
    (cambios.cotizacionEstado as string) ?? servicio.cotizacionEstado ?? 'PENDIENTE';

  const puedeCambiarRespuesta =
    servicio.estado === 'COTIZADO' && ['Comercial', 'Administrador'].includes(roles[0] ?? '');

  const handleRegistrarCotizacion = async () => {
    navigate(`/servicios/${id}`);
  };

  const handleCambiarRespuesta = async (nuevaRespuesta: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA') => {
    const resultado = await cambiarRespuestaCotizacion(
      servicio.id,
      nuevaRespuesta,
      roles[0] ?? 'Tecnico',
      container.db
    );
    if (resultado.ok) {
      setCambios({ ...cambios, cotizacionEstado: resultado.servicio.cotizacionEstado });
    }
  };

  return (
    <div className="etapa-cotizacion">
      <h2>{t('cotizacion.titulo')}</h2>
      <p className="subtitulo">{t('cotizacion.subtitulo')}</p>

      <div className="form">
        <div className="campo-fecha">
          <label htmlFor="fecha-envio">{t('cotizacion.fechaEnvio')}</label>
          <input
            id="fecha-envio"
            type="date"
            value={fechaEnvio || ''}
            onChange={(e) => setCambios({ ...cambios, cotizacionFechaEnvio: e.target.value })}
          />
          <small>{t('cotizacion.fechaEnvioAyuda')}</small>
        </div>

        <CampoMoneda
          label={t('cotizacion.valor')}
          valor={valor}
          onChange={(v) => setCambios({ ...cambios, cotizacionValor: v })}
          requerido={false}
          helpText={t('cotizacion.valorAyuda')}
        />

        <div className="seccion-pdf">
          <label>{t('cotizacion.cotizacionPdf')}</label>
          <small>{t('cotizacion.cotizacionPdfAyuda')}</small>

          {adjuntos && adjuntos.length > 0 ? (
            adjuntos.map((adj) => (
              <AdjuntoPdf key={adj.id} adjunto={adj} onDelete={() => {}} onReplace={() => {}} />
            ))
          ) : (
            <button className="btn-adjuntar" type="button">
              {t('cotizacion.adjuntar')}
            </button>
          )}
        </div>

        {servicio.estado === 'COTIZADO' && (
          <div className="selector-respuesta">
            <label>{t('cotizacion.respuesta')}</label>

            <div className="botones-respuesta">
              <button
                type="button"
                onClick={() => handleCambiarRespuesta('PENDIENTE')}
                className={`btn-respuesta ${estadoActual === 'PENDIENTE' ? 'activo' : ''}`}
                disabled={!puedeCambiarRespuesta}
              >
                {t('cotizacion.respuestaPendiente')}
              </button>
              <button
                type="button"
                onClick={() => handleCambiarRespuesta('APROBADA')}
                className={`btn-respuesta ${estadoActual === 'APROBADA' ? 'activo' : ''}`}
                disabled={!puedeCambiarRespuesta}
              >
                {t('cotizacion.respuestaAprobada')}
              </button>
              <button
                type="button"
                onClick={() => handleCambiarRespuesta('RECHAZADA')}
                className={`btn-respuesta ${estadoActual === 'RECHAZADA' ? 'activo' : ''}`}
                disabled={!puedeCambiarRespuesta}
              >
                {t('cotizacion.respuestaRechazada')}
              </button>
            </div>
          </div>
        )}

        <div className="acciones">
          <button onClick={handleRegistrarCotizacion} className="btn-completar">
            {t('cotizacion.completar')}
          </button>
          <button onClick={() => navigate(`/servicios/${id}`)} className="btn-cancelar">
            {t('etapas:cancelar')}
          </button>
        </div>
      </div>
    </div>
  );
}
