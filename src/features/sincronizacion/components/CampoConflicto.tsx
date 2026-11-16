import { Radio, RadioGroup } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import styles from './CampoConflicto.module.css';

export type OrigenValor = 'LOCAL' | 'REMOTO';

interface CampoConflictoProps {
  /** Nombre legible del campo: etiqueta accesible del grupo. */
  readonly etiqueta: string;
  readonly seleccion: OrigenValor | undefined;
  readonly onChange: (valor: OrigenValor) => void;
}

/** Elección entre «Mi valor» y «SharePoint» para un campo en conflicto (RadioGroup accesible). */
export function CampoConflicto({
  etiqueta,
  seleccion,
  onChange,
}: CampoConflictoProps): React.JSX.Element {
  const { t } = useTranslation('sync');

  return (
    <RadioGroup
      className={styles.grupo!}
      value={seleccion ?? null}
      onChange={(valor) => onChange(valor as OrigenValor)}
      aria-label={etiqueta}
    >
      <Radio value="LOCAL" className={styles.opcion!}>
        {t('conflictos.campo.miValor')}
      </Radio>
      <Radio value="REMOTO" className={styles.opcion!}>
        {t('conflictos.campo.sharepoint')}
      </Radio>
    </RadioGroup>
  );
}
