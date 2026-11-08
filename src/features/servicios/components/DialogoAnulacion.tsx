import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './DialogoAnulacion.module.css';

export interface DialogoAnulacionProps {
  abierto: boolean;
  cargando?: boolean;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}

export default function DialogoAnulacion({
  abierto,
  cargando = false,
  onConfirmar,
  onCancelar,
}: DialogoAnulacionProps) {
  const { t } = useTranslation('etapas');
  const [motivo, setMotivo] = useState('');

  const motivoValido = motivo.trim().length >= 10;

  const handleConfirmar = () => {
    if (motivoValido) {
      onConfirmar(motivo);
      setMotivo('');
    }
  };

  const handleCancelar = () => {
    setMotivo('');
    onCancelar();
  };

  if (!abierto) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialogo}>
        <div className={styles.header}>
          <h3>{t('anulacion.confirmarTitulo')}</h3>
        </div>

        <div className={styles.contenido}>
          <p>{t('anulacion.confirmarTexto')}</p>

          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={t('anulacion.motivo')}
            rows={4}
            disabled={cargando}
            className={styles.textarea}
          />
          <small>{t('anulacion.motivoAyuda')}</small>
        </div>

        <div className={styles.acciones}>
          <button
            onClick={handleConfirmar}
            disabled={!motivoValido || cargando}
            className={styles['btn-confirmar']}
          >
            {t('anulacion.confirmar')}
          </button>
          <button onClick={handleCancelar} disabled={cargando} className={styles['btn-cancelar']}>
            {t('etapas:cancelar')}
          </button>
        </div>
      </div>
    </div>
  );
}
