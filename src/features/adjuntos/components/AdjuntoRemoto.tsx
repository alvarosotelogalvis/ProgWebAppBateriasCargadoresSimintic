import { useTranslation } from 'react-i18next';
import { useOnline } from '@/shared/hooks/useOnline';
import type { Adjunto } from '@/domain/adjunto';

interface AdjuntoRemotoProps {
  readonly adjunto: Adjunto;
  readonly miniatura?: Blob | null;
}

/**
 * Adjunto remoto con miniatura, badge y link para abrir en SharePoint
 * - Muestra miniatura o ícono PDF según tipo
 * - Badge "En SharePoint"
 * - Link "Abrir en SharePoint" habilitado solo con conexión
 * T-024
 */
export function AdjuntoRemoto({ adjunto, miniatura }: AdjuntoRemotoProps): React.JSX.Element {
  const { t } = useTranslation('adjuntos');
  const enLinea = useOnline();

  const abrirEnSharePoint = () => {
    if (adjunto.sp?.webUrl && enLinea) {
      window.open(adjunto.sp.webUrl, '_blank');
    }
  };

  const esImage = adjunto.mime?.startsWith('image/');
  const esPDF = adjunto.mime === 'application/pdf';

  return (
    <div style={{ position: 'relative' }}>
      {/* Miniatura o ícono */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {esImage && miniatura ? (
          <img
            src={URL.createObjectURL(miniatura)}
            alt={adjunto.nombreArchivo}
            style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
          />
        ) : esPDF ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              aspectRatio: '1',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '32px',
            }}
          >
            📄
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              aspectRatio: '1',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '32px',
            }}
          >
            📎
          </div>
        )}

        {/* Badge "En SharePoint" */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: '#0078d4',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '2px',
            fontSize: '10px',
            fontWeight: 500,
          }}
        >
          {t('remoto.badge')}
        </div>
      </div>

      {/* Link para abrir en SharePoint */}
      <button
        type="button"
        onClick={abrirEnSharePoint}
        disabled={!enLinea}
        style={{
          display: 'block',
          marginTop: '8px',
          padding: '6px 12px',
          backgroundColor: enLinea ? '#0078d4' : '#e0e0e0',
          color: enLinea ? 'white' : '#999',
          border: 'none',
          borderRadius: '4px',
          cursor: enLinea ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          fontWeight: 500,
        }}
        title={enLinea ? t('remoto.abrir') : t('remoto.sinRed')}
      >
        {t('remoto.abrir')}
      </button>

      {/* Información */}
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
        <div>{adjunto.nombreArchivo}</div>
        <div>{(adjunto.tamanoBytes / 1024).toFixed(1)} KB</div>
      </div>
    </div>
  );
}
