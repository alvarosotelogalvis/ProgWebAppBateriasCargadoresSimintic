import type { TFunction } from 'i18next';

import type { CamposServicio } from '@/domain/servicio';
import { SECCIONES_CORREGIBLES } from '@/features/servicios/camposCorregibles';

const ETIQUETA_POR_CAMPO: ReadonlyMap<string, string> = new Map(
  SECCIONES_CORREGIBLES.flatMap((seccion) =>
    seccion.campos.map((definicion) => [definicion.campo, definicion.etiqueta] as const)
  )
);

/** Nombre legible de un campo del servicio (el mismo que ve el usuario en los formularios). */
export function etiquetaCampo(t: TFunction, campo: keyof CamposServicio): string {
  const clave = ETIQUETA_POR_CAMPO.get(campo);
  return clave ? t(clave) : campo;
}

/** Valor de un campo tal como se muestra al elegir entre el local y el remoto. */
export function formatearValorCampo(
  t: TFunction,
  campo: keyof CamposServicio,
  valor: unknown
): string {
  if (valor === undefined || valor === null || valor === '') return t('sync:conflictos.sinValor');
  if (campo === 'estado' && typeof valor === 'string') return t(`servicios:estado.${valor}`);
  if (typeof valor === 'number') return valor.toLocaleString('es-CO');
  return String(valor);
}
