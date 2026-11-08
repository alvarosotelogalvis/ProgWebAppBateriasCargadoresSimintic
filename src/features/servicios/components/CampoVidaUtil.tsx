import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sugerirVidaUtil } from '@/domain/vidaUtil';
import styles from './CampoVidaUtil.module.css';

export interface CampoVidaUtilProps {
  fechaEntrega: string;
  valor?: string;
  onChange: (valor: string) => void;
  requerido?: boolean;
  opcional?: boolean;
}

export default function CampoVidaUtil({
  fechaEntrega,
  valor = '',
  onChange,
  requerido = true,
  opcional = false,
}: CampoVidaUtilProps) {
  const { t } = useTranslation('etapas');
  const [error, setError] = useState<string | null>(null);

  const mesesSugerencia = [6, 12, 18, 24];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoValor = e.target.value;
    onChange(nuevoValor);

    if (nuevoValor && nuevoValor <= fechaEntrega) {
      setError(t('entrega.error_vidaUtilAnterior'));
    } else {
      setError(null);
    }
  };

  const handleChip = (meses: number) => {
    const nueva = sugerirVidaUtil(fechaEntrega, meses);
    onChange(nueva);
    setError(null);
  };

  const etiqueta = opcional ? t('entrega.vidaUtilOpcional') : t('entrega.vidaUtil');

  return (
    <div className={styles['campo-vida-util']}>
      <label htmlFor="vida-util">{etiqueta}</label>
      <input
        id="vida-util"
        type="date"
        value={valor}
        onChange={handleChange}
        aria-required={requerido}
        aria-describedby={error ? 'vida-util-error' : 'vida-util-ayuda'}
      />

      {!error && <small id="vida-util-ayuda">{t('entrega.vidaUtilAyuda')}</small>}

      {error && (
        <small id="vida-util-error" className={styles.error}>
          {error}
        </small>
      )}

      <div className={styles.sugerencias}>
        <span className={styles.label}>{t('entrega.sugerencias.meses12')}</span>
        <div className={styles.chips}>
          {mesesSugerencia.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleChip(m)}
              className={`${styles.chip} ${valor === sugerirVidaUtil(fechaEntrega, m) ? styles.activo : ''}`}
            >
              {t(`entrega.sugerencias.meses${m}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
