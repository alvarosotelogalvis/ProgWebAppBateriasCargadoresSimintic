import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Servicio } from '@/domain/servicio';
import type { Eleccion } from '@/application/servicios/resolverConflictos';
import { CampoConflicto } from '../components/CampoConflicto';

/**
 * Página para resolver conflictos
 * UX §3.9: Tarjetas en compacto, tabla en expandido
 * T-020
 */

interface ResolverConflictoPageProps {
  readonly servicio: Servicio;
  readonly onResolver: (elecciones: Eleccion[]) => Promise<void>;
}

export function ResolverConflictoPage({ servicio, onResolver }: ResolverConflictoPageProps) {
  const { t } = useTranslation('sync');
  const [elecciones, setElecciones] = useState<Map<string, 'LOCAL' | 'REMOTO'>>(new Map());

  const todasElegidas =
    servicio.conflictos.length > 0 && servicio.conflictos.every((c) => elecciones.has(c.campo));

  const handleChange = (campo: string, valor: 'LOCAL' | 'REMOTO') => {
    const nueva = new Map(elecciones);
    nueva.set(campo, valor);
    setElecciones(nueva);
  };

  const handleAplicar = async () => {
    const eleccionesArray: Eleccion[] = servicio.conflictos
      .filter((c) => elecciones.has(c.campo))
      .map((c) => ({
        campo: c.campo,
        usar: elecciones.get(c.campo)!,
      }));

    await onResolver(eleccionesArray);
  };

  return (
    <div>
      <h2>{t('conflictos.titulo')}</h2>

      <div role="region" aria-label="Conflictos">
        {servicio.conflictos.map((conflicto) => (
          <CampoConflicto
            key={conflicto.campo}
            conflicto={conflicto}
            seleccion={elecciones.get(conflicto.campo)}
            onChange={(valor) => handleChange(conflicto.campo, valor)}
          />
        ))}
      </div>

      <button onClick={handleAplicar} disabled={!todasElegidas} type="button">
        {t('conflictos.boton')}
      </button>
    </div>
  );
}
