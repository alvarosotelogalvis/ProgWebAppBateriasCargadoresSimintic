import { useState } from 'react';
import type { Adjunto } from '@/domain/adjunto';
import { useTranslation } from 'react-i18next';
import styles from './AdjuntoPdf.module.css';

export interface AdjuntoPdfProps {
  adjunto: Adjunto;
  onReplace?: (archivo: File) => void;
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

    onReplace(archivo);
    e.currentTarget.value = '';
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
            {t('etapas:pdf.ver')}
          </button>

          {estaRemoto && (
            <button onClick={handleVerEnSharePoint} className={styles['btn-remoto']} type="button">
              {t('etapas:pdf.verEnSharePoint')}
            </button>
          )}

          {!readOnly && (
            <>
              <label className={styles['btn-reemplazar']}>
                {t('etapas:pdf.reemplazar')}
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
                {t('etapas:pdf.eliminar')}
              </button>
            </>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className={styles.confirmacion}>
          <p>{t('etapas:pdf.confirmarEliminacion')}</p>
          <button onClick={handleDeleteConfirm} className={styles['btn-confirmar']} type="button">
            {t('etapas:pdf.confirmarSi')}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className={styles['btn-cancelar']}
            type="button"
          >
            {t('etapas:pdf.confirmarNo')}
          </button>
        </div>
      )}
    </div>
  );
}
