import { useState } from 'react';
import type { Adjunto } from '@/domain/servicio';
import { useTranslation } from 'react-i18next';
import styles from './AdjuntoPdf.module.css';

export interface AdjuntoPdfProps {
  adjunto: Adjunto;
  onReplace?: (nuevoAdjunto: Adjunto) => void;
  onDelete?: (adjuntoId: string) => void;
  readOnly?: boolean;
}

export default function AdjuntoPdf({
  adjunto,
  onReplace,
  onDelete,
  readOnly = false,
}: AdjuntoPdfProps) {
  const { t } = useTranslation(['adjuntos', 'etapas']);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tamanoKB = Math.round((adjunto.blob?.size ?? 0) / 1024);
  const estaRemoto = Boolean(adjunto.sp);

  const handleVer = () => {
    if (!adjunto.blob) return;
    const url = URL.createObjectURL(adjunto.blob);
    window.open(url, '_blank');
  };

  const handleVerEnSharePoint = () => {
    if (adjunto.sp?.webUrl) {
      window.open(adjunto.sp.webUrl, '_blank');
    }
  };

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.currentTarget.files?.[0];
    if (!archivo || !onReplace) return;

    const blob = new Blob([await archivo.arrayBuffer()], { type: 'application/pdf' });
    const nuevoAdjunto: Adjunto = {
      ...adjunto,
      blob,
      actualizadoEn: new Date().toISOString(),
      syncState: 'pending',
    };
    onReplace(nuevoAdjunto);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(adjunto.id);
    }
    setShowDeleteConfirm(false);
  };

  return (
    <div className={styles['adjunto-pdf']}>
      <div className={styles.header}>
        <span className={styles.icon}>📄</span>
        <div className={styles.info}>
          <div className={styles.nombre}>{adjunto.tipo.replace(/_/g, ' ')}</div>
          <div className={styles.tamano}>{tamanoKB} KB</div>
        </div>
      </div>

      {!readOnly && (
        <div className={styles.acciones}>
          <button onClick={handleVer} className={styles['btn-ver']} type="button">
            {t('adjuntos:ver')}
          </button>

          {estaRemoto && (
            <button onClick={handleVerEnSharePoint} className={styles['btn-remoto']} type="button">
              {t('etapas:pdf.verEnSharePoint')}
            </button>
          )}

          {!readOnly && (
            <>
              <label className={styles['btn-reemplazar']}>
                {t('adjuntos:reemplazar')}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleReplace}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={styles['btn-eliminar']}
                type="button"
              >
                {t('adjuntos:eliminar')}
              </button>
            </>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className={styles.confirmacion}>
          <p>{t('adjuntos:confirmarEliminacion')}</p>
          <button onClick={handleDeleteConfirm} className={styles['btn-confirmar']} type="button">
            {t('adjuntos:si')}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className={styles['btn-cancelar']}
            type="button"
          >
            {t('adjuntos:no')}
          </button>
        </div>
      )}
    </div>
  );
}
