import { useTranslation } from 'react-i18next';
import type { Conflicto } from '@/domain/servicio';

/**
 * Campo en conflicto con dos opciones seleccionables (LOCAL / REMOTO)
 * RAC RadioGroup + CardInner seleccionables
 * T-020
 */

interface CampoConflictoProps {
  readonly conflicto: Conflicto;
  readonly seleccion?: 'LOCAL' | 'REMOTO';
  readonly onChange: (valor: 'LOCAL' | 'REMOTO') => void;
  readonly editor?: string;
  readonly editorNombre?: string;
  readonly modificadoEn?: string;
}

export function CampoConflicto({
  conflicto,
  seleccion,
  onChange,
  editorNombre,
  modificadoEn,
}: CampoConflictoProps) {
  const { t } = useTranslation('sync');

  return (
    <fieldset>
      <legend>{conflicto.campo}</legend>

      <div role="radiogroup">
        <label>
          <input
            type="radio"
            name={`conflicto-${conflicto.campo}`}
            value="LOCAL"
            checked={seleccion === 'LOCAL'}
            onChange={() => onChange('LOCAL')}
          />
          <span>
            {t('conflictos.campo.miValor')}: {String(conflicto.local ?? '')}
          </span>
        </label>

        <label>
          <input
            type="radio"
            name={`conflicto-${conflicto.campo}`}
            value="REMOTO"
            checked={seleccion === 'REMOTO'}
            onChange={() => onChange('REMOTO')}
          />
          <span>
            {t('conflictos.campo.sharepoint')}: {String(conflicto.remoto ?? '')}
          </span>
          {editorNombre && modificadoEn && (
            <small>
              ({editorNombre}, {new Date(modificadoEn).toLocaleString('es-CO')})
            </small>
          )}
        </label>
      </div>
    </fieldset>
  );
}
