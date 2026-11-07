import { useTranslation } from 'react-i18next';

import { antiguedadHoras, debeRecordarPendientes } from '@/application/sync/avisosSync';
import { Banner } from '@/shared/ui/Banner';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';

interface Props {
  readonly cantidad: number;
  readonly masAntiguoEn?: string;
  /** `RecordatorioPendientesHoras` de la configuración remota. */
  readonly umbralHoras: number;
  readonly ahoraMs?: number;
  readonly onSincronizar: () => void;
}

const HORAS_POR_DIA = 24;

/** ES-005-22: recordatorio destacado cuando hay pendientes antiguos. */
export function RecordatorioPendientes({
  cantidad,
  masAntiguoEn,
  umbralHoras,
  ahoraMs = Date.now(),
  onSincronizar,
}: Props): React.JSX.Element | null {
  const { t } = useTranslation('inicio');

  if (cantidad <= 0 || !debeRecordarPendientes(masAntiguoEn, ahoraMs, umbralHoras)) return null;

  const horas = antiguedadHoras(masAntiguoEn, ahoraMs) ?? 0;
  const antiguedad =
    horas >= 2 * HORAS_POR_DIA
      ? t('recordatorio.dias', { count: Math.floor(horas / HORAS_POR_DIA) })
      : t('recordatorio.horas', { count: horas });

  return (
    <Banner
      tipo="advertencia"
      accion={
        <PrimaryButton onPress={onSincronizar}>{t('recordatorio.sincronizar')}</PrimaryButton>
      }
    >
      {t('recordatorio.mensaje', { count: cantidad, antiguedad })}
    </Banner>
  );
}
