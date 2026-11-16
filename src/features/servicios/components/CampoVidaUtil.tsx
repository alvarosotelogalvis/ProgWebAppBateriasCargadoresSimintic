import { useTranslation } from 'react-i18next';

import { sugerirVidaUtil } from '@/domain/vidaUtil';
import { DateChip } from '@/shared/ui/DateChip';
import styles from './CampoVidaUtil.module.css';

export interface CampoVidaUtilProps {
  fechaEntrega: string;
  valor?: string;
  onChange: (valor: string) => void;
  /** En la entrega sin reparación la vida útil es opcional. */
  opcional?: boolean;
}

const MESES_SUGERIDOS = [6, 12, 18, 24] as const;

/** Proyección de vida útil: fecha posterior a la entrega, con atajos de +6/+12/+18/+24 meses. */
export default function CampoVidaUtil({
  fechaEntrega,
  valor = '',
  onChange,
  opcional = false,
}: CampoVidaUtilProps) {
  const { t } = useTranslation('etapas');
  const error = valor && valor <= fechaEntrega ? t('entrega.error_vidaUtilAnterior') : undefined;
  const etiqueta = opcional ? t('entrega.vidaUtilOpcional') : t('entrega.vidaUtil');

  return (
    <div className={styles['campo-vida-util']}>
      <DateChip
        id="vida-util"
        etiqueta={etiqueta}
        valor={valor}
        onCambio={onChange}
        error={error}
      />
      {error ? null : <small className={styles.ayuda}>{t('entrega.vidaUtilAyuda')}</small>}

      <div role="group" aria-label={etiqueta} className={styles.chips}>
        {MESES_SUGERIDOS.map((meses) => {
          const sugerida = sugerirVidaUtil(fechaEntrega, meses);
          return (
            <button
              key={meses}
              type="button"
              aria-pressed={valor === sugerida}
              onClick={() => onChange(sugerida)}
              className={`${styles.chip} ${valor === sugerida ? styles.activo : ''}`}
            >
              {t(`entrega.sugerencias.meses${meses}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
