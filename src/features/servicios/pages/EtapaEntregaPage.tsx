import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/containerContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { fechaLocalHoy } from '@/domain/validaciones';
import CampoVidaUtil from '../components/CampoVidaUtil';

export function EtapaEntregaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const container = useContainer();
  const { t } = useTranslation(['etapas', 'servicios']);

  const [cambios, setCambios] = useState<Record<string, unknown>>({});

  const servicio = useLiveQuery(async () => {
    if (!id) return undefined;
    return container.db.servicios.get(id);
  }, [id, container.db]);

  const config = useLiveQuery(async () => {
    return container.db.catalogos.where('id').equals('config').first();
  }, [container.db]);

  const adjuntos = useLiveQuery(async () => {
    if (!servicio) return [];
    return container.db.adjuntos
      .where('servicioId')
      .equals(servicio.id)
      .filter((a) => a.tipo === 'FOTO_SALIDA')
      .toArray();
  }, [servicio, container.db]);

  if (!servicio || !config) return <div>{t('servicios:cargando')}</div>;

  const hoy = fechaLocalHoy();
  const fechaEntrega = (cambios.fechaEntrega as string) ?? servicio.fechaEntrega ?? hoy;
  const vidaUtil = (cambios.proyeccionVidaUtil as string) ?? servicio.proyeccionVidaUtil ?? '';

  const conReparacion = servicio.estado === 'EN_REPARACION';
  const vidaUtilRequerida = conReparacion;
  const fotosMinimas = config.minFotosSalida ?? 1;

  const fotosValidas = (adjuntos?.length ?? 0) >= fotosMinimas;
  const vidaUtilValida = !vidaUtilRequerida || (vidaUtil && vidaUtil > fechaEntrega);

  const handleCompletarEntrega = async () => {
    navigate(`/servicios/${id}`);
  };

  return (
    <div className="etapa-entrega">
      <h2>{t('entrega.titulo')}</h2>
      <p className="subtitulo">
        {conReparacion ? t('entrega.subtitulo') : t('entrega.sinReparacionAyuda')}
      </p>

      <div className="form">
        <div className="campo-fecha">
          <label htmlFor="fecha-entrega">{t('entrega.fecha')}</label>
          <input
            id="fecha-entrega"
            type="date"
            value={fechaEntrega}
            onChange={(e) => setCambios({ ...cambios, fechaEntrega: e.target.value })}
            max={hoy}
          />
          <small>{t('entrega.fechaAyuda')}</small>
        </div>

        <div className="seccion-fotos">
          <label>{t('entrega.fotos')}</label>
          <small>{t('entrega.fotosAyuda')}</small>
          <p>
            {fotosValidas
              ? `✓ ${adjuntos?.length || 0} foto(s)`
              : `✗ Faltan ${fotosMinimas - (adjuntos?.length || 0)} foto(s)`}
          </p>
          <button className="btn-adjuntar" type="button">
            {t('entrega.agregarFoto')}
          </button>
        </div>

        <CampoVidaUtil
          fechaEntrega={fechaEntrega}
          valor={vidaUtil}
          onChange={(v) => setCambios({ ...cambios, proyeccionVidaUtil: v })}
          requerido={vidaUtilRequerida}
          opcional={!vidaUtilRequerida}
        />

        <div className="acciones">
          <button
            onClick={handleCompletarEntrega}
            className="btn-completar"
            disabled={!fotosValidas || !vidaUtilValida}
          >
            {t('entrega.completar')}
          </button>
          <button onClick={() => navigate(`/servicios/${id}`)} className="btn-cancelar">
            {t('etapas:cancelar')}
          </button>
        </div>
      </div>
    </div>
  );
}
