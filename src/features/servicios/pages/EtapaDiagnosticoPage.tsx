import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/containerContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import CampoDiagnostico from '../components/CampoDiagnostico';
import AdjuntoPdf from '@/features/adjuntos/components/AdjuntoPdf';

export function EtapaDiagnosticoPage() {
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
      .filter((a) => ['FORMATO_DIAGNOSTICO', 'DISPOSICION_FINAL'].includes(a.tipo))
      .toArray();
  }, [servicio, container.db]);

  if (!servicio) return <div>{t('servicios:cargando')}</div>;

  const diagnosticoActual = (cambios.diagnostico as string) ?? servicio.diagnostico;
  const esDisposicionFinal =
    diagnosticoActual === (config?.DiagnosticoValorDisposicionFinal as string);

  const handleCompletarDiagnostico = async () => {
    navigate(`/servicios/${id}`);
  };

  return (
    <div className="etapa-diagnostico">
      <h2>{t('diagnostico.titulo')}</h2>
      <p className="subtitulo">{t('diagnostico.subtitulo')}</p>

      <div className="form">
        <CampoDiagnostico
          valor={diagnosticoActual}
          onChange={(valor) => setCambios({ ...cambios, diagnostico: valor })}
          disabled={false}
        />

        <div className="campo-observacion">
          <label htmlFor="observacion">{t('diagnostico.observacion')}</label>
          <textarea
            id="observacion"
            value={((cambios.observacionTecnica as string) ?? servicio.observacionTecnica) || ''}
            onChange={(e) => setCambios({ ...cambios, observacionTecnica: e.target.value })}
            placeholder={t('diagnostico.observacionAyuda')}
            rows={4}
          />
          <small>{t('diagnostico.observacionAyuda')}</small>
        </div>

        {!esDisposicionFinal && (
          <div className="seccion-pdf">
            <label>{t('diagnostico.formatoPdf')}</label>
            <small>{t('diagnostico.formatoPdfAyuda')}</small>

            {adjuntos?.filter((a) => a.tipo === 'FORMATO_DIAGNOSTICO').length > 0 ? (
              adjuntos
                ?.filter((a) => a.tipo === 'FORMATO_DIAGNOSTICO')
                .map((adj) => (
                  <AdjuntoPdf key={adj.id} adjunto={adj} onDelete={() => {}} onReplace={() => {}} />
                ))
            ) : (
              <button className="btn-adjuntar" type="button">
                {t('diagnostico.adjuntar')}
              </button>
            )}
          </div>
        )}

        {esDisposicionFinal && (
          <div className="rama-df">
            <div className="banner">{t('disposicionFinal.aviso')}</div>

            <div className="campo-fecha">
              <label htmlFor="fecha-socializacion">
                {t('disposicionFinal.fechaSocializacion')}
              </label>
              <input
                id="fecha-socializacion"
                type="date"
                value={
                  ((cambios.fechaSocializacionDF as string) ?? servicio.fechaSocializacionDF) || ''
                }
                onChange={(e) => setCambios({ ...cambios, fechaSocializacionDF: e.target.value })}
              />
              <small>{t('disposicionFinal.fechaSocializacionAyuda')}</small>
            </div>

            <div className="seccion-pdf">
              <label>{t('disposicionFinal.disposicionPdf')}</label>
              <small>{t('disposicionFinal.disposicionPdfAyuda')}</small>

              {adjuntos?.filter((a) => a.tipo === 'DISPOSICION_FINAL').length > 0 ? (
                adjuntos
                  ?.filter((a) => a.tipo === 'DISPOSICION_FINAL')
                  .map((adj) => (
                    <AdjuntoPdf
                      key={adj.id}
                      adjunto={adj}
                      onDelete={() => {}}
                      onReplace={() => {}}
                    />
                  ))
              ) : (
                <button className="btn-adjuntar" type="button">
                  {t('diagnostico.adjuntar')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="acciones">
          <button onClick={handleCompletarDiagnostico} className="btn-completar">
            {esDisposicionFinal ? t('disposicionFinal.completar') : t('diagnostico.completar')}
          </button>
          <button onClick={() => navigate(`/servicios/${id}`)} className="btn-cancelar">
            {t('etapas:cancelar')}
          </button>
        </div>
      </div>
    </div>
  );
}
