import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { TransicionInvalidaError } from '@/domain/errores';
import type { AccionEtapa } from '@/domain/estados';
import type { CamposServicio, Rol } from '@/domain/servicio';

interface Opciones {
  readonly servicioId: string;
  readonly roles: readonly Rol[];
  /** Texto de "falta este adjunto" según el tipo (p. ej. FORMATO_DIAGNOSTICO). */
  readonly etiquetaAdjunto?: (tipo: string) => string | undefined;
}

/**
 * Guarda los campos de la etapa y ejecuta su transición. Si el dominio rechaza la
 * transición, expone la lista traducida de lo que falta; si va bien, vuelve al detalle.
 */
export const useCompletarEtapa = ({ servicioId, roles, etiquetaAdjunto }: Opciones) => {
  const { t } = useTranslation(['etapas', 'errores']);
  const navigate = useNavigate();
  const { casosDeUso } = useContainer();
  const [completando, setCompletando] = useState(false);
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const traducir = (clave: string, adjunto?: string): string => {
    const deAdjunto = adjunto ? etiquetaAdjunto?.(adjunto) : undefined;
    if (deAdjunto) return deAdjunto;
    return clave.startsWith('errores.') ? t(`errores:${clave.slice('errores.'.length)}`) : t(clave);
  };

  const completar = async (
    accion: AccionEtapa,
    cambios: Partial<CamposServicio> = {}
  ): Promise<void> => {
    setFaltantes([]);
    setErrorGeneral(undefined);
    setCompletando(true);
    try {
      if (Object.keys(cambios).length > 0) {
        await casosDeUso.actualizarCampos(servicioId, cambios, roles);
      }
      await casosDeUso.completarEtapa(servicioId, accion, roles);
      navigate(`/servicios/${servicioId}`, { replace: true });
    } catch (error) {
      if (error instanceof TransicionInvalidaError && error.errores.length > 0) {
        setFaltantes([
          ...new Set(error.errores.map((falla) => traducir(falla.clave, falla.adjunto))),
        ]);
      } else {
        setErrorGeneral(t('etapas:errores.ESTADO'));
      }
      setCompletando(false);
    }
  };

  return { completar, completando, faltantes, errorGeneral };
};
