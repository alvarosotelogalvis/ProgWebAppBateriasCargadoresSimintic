import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/containerContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { fechaLocalHoy } from '@/domain/validaciones';
import AdjuntoPdf from '@/features/adjuntos/components/AdjuntoPdf';

const FORMATO_NUMERO_FACTURA = /^[A-Z0-9\s-]*$/;

export function EtapaFacturacionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const container = useContainer();
  const { t } = useTranslation(['etapas', 'servicios']);

  const [cambios, setCambios] = useState<Record<string, unknown>>({});
  const [numeroError, setNumeroError] = useState<string | null>(null);

  const servicio = useLiveQuery(async () => {
    if (!id) return undefined;
    return container.db.servicios.get(id);
  }, [id, container.db]);

  const adjuntos = useLiveQuery(async () => {
    if (!servicio) return [];
    return container.db.adjuntos
      .where('servicioId')
      .equals(servicio.id)
      .filter((a) => a.tipo === 'FACTURA')
      .toArray();
  }, [servicio, container.db]);

  if (!servicio) return <div>{t('servicios:cargando')}</div>;

  const hoy = fechaLocalHoy();
  const fecha = (cambios.facturaFecha as string) ?? servicio.facturaFecha ?? hoy;
  const numero = (cambios.facturaNumero as string) ?? servicio.facturaNumero ?? '';

  const pdfPresente = (adjuntos?.length ?? 0) > 0;
  const numeroValido = !numero || FORMATO_NUMERO_FACTURA.test(numero);

  const handleValidarNumero = (e: React.FocusEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    if (valor && !FORMATO_NUMERO_FACTURA.test(valor)) {
      setNumeroError(t('facturacion.error_numeroFormato'));
    } else {
      setNumeroError(null);
    }
  };

  const handleCompletarFacturacion = async () => {
    navigate(`/servicios/${id}`);
  };

  return (
    <div className="etapa-facturacion">
      <h2>{t('facturacion.titulo')}</h2>
      <p className="subtitulo">{t('facturacion.subtitulo')}</p>

      <div className="form">
        <div className="seccion-pdf">
          <label>{t('facturacion.pdf')}</label>
          <small>{t('facturacion.pdfAyuda')}</small>

          {adjuntos && adjuntos.length > 0 ? (
            adjuntos.map((adj) => (
              <AdjuntoPdf key={adj.id} adjunto={adj} onDelete={() => {}} onReplace={() => {}} />
            ))
          ) : (
            <button className="btn-adjuntar" type="button">
              {t('facturacion.adjuntar')}
            </button>
          )}
        </div>

        <div className="campo-fecha">
          <label htmlFor="fecha-factura">{t('facturacion.fecha')}</label>
          <input
            id="fecha-factura"
            type="date"
            value={fecha}
            onChange={(e) => setCambios({ ...cambios, facturaFecha: e.target.value })}
            max={hoy}
          />
          <small>{t('facturacion.fechaAyuda')}</small>
        </div>

        <div className="campo-numero">
          <label htmlFor="numero-factura">{t('facturacion.numero')}</label>
          <input
            id="numero-factura"
            type="text"
            value={numero}
            onChange={(e) => setCambios({ ...cambios, facturaNumero: e.target.value })}
            onBlur={handleValidarNumero}
            placeholder={t('facturacion.numeroAyuda')}
          />
          {numeroError && <small className="error">{numeroError}</small>}
          {!numeroError && <small>{t('facturacion.numeroAyuda')}</small>}
        </div>

        <div className="acciones">
          <button
            onClick={handleCompletarFacturacion}
            className="btn-completar"
            disabled={!pdfPresente || !numeroValido}
          >
            {t('facturacion.completar')}
          </button>
          <button onClick={() => navigate(`/servicios/${id}`)} className="btn-cancelar">
            {t('etapas:cancelar')}
          </button>
        </div>
      </div>
    </div>
  );
}
