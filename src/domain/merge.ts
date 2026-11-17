import { generarCodigo } from './codigo';
import { indiceEstado } from './estados';
import type { CamposServicio, ConflictoCampo, Servicio } from './servicio';
import { CAMPOS_SERVICIO } from './servicio';

export type RemotoServicio = Partial<CamposServicio> & {
  eTag?: string;
  itemId?: string;
  /** Campos que SharePoint dejó vacíos (no se confunden con «no informado»). */
  vaciados?: readonly (keyof CamposServicio)[];
};

export interface ResultadoMerge {
  servicio: Servicio;
  conflictos: ConflictoCampo[];
}

const tiene = (objeto: object, campo: string): boolean =>
  Object.prototype.hasOwnProperty.call(objeto, campo);

const mismoValor = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if ((a === undefined && b === null) || (a === null && b === undefined)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
};

const CAMPOS_MINIMOS_POR_ESTADO: Partial<
  Record<CamposServicio['estado'], (keyof CamposServicio)[]>
> = {
  RECIBIDO: ['tipoEquipo', 'fechaRecepcion', 'clienteId', 'marca', 'referencia', 'serie'],
  DIAGNOSTICADO: ['diagnostico', 'observacionTecnica'],
  COTIZADO: ['cotizacionFechaEnvio'],
  EN_REPARACION: ['otDetalle', 'otCostoReparacion'],
  ENTREGADO: ['fechaEntrega'],
  FACTURADO: ['facturaFecha'],
  DISPOSICION_FINAL: ['diagnostico', 'observacionTecnica', 'fechaSocializacionDF'],
  ANULADO: ['anulacionMotivo'],
};

const estadoCoherente = (campos: Partial<CamposServicio>): boolean => {
  const requeridos = CAMPOS_MINIMOS_POR_ESTADO[campos.estado ?? 'BORRADOR'];
  if (!requeridos) return true;
  return requeridos.every((campo) => {
    const valor = campos[campo];
    return valor !== undefined && valor !== null && valor !== '';
  });
};

/** Compone los cambios locales y remotos campo por campo (SDD §9.5). */
export const mergeTresVias = (local: Servicio, remoto: RemotoServicio): ResultadoMerge => {
  const resultado: Servicio = { ...local, camposSucios: [...local.camposSucios] };
  const sucios = new Set<keyof CamposServicio>(local.camposSucios);
  const conflictos: ConflictoCampo[] = [];
  const vaciados = new Set<keyof CamposServicio>(remoto.vaciados ?? []);
  /** Asigna el valor; un valor vacío elimina la propiedad (`exactOptionalPropertyTypes`). */
  const poner = (campo: keyof CamposServicio, valor: unknown): void => {
    if (valor === undefined) delete resultado[campo];
    else resultado[campo] = valor as never;
  };

  for (const campo of CAMPOS_SERVICIO) {
    const localSucio = sucios.has(campo);
    const remotoVacio =
      vaciados.has(campo) && !(tiene(remoto, campo) && remoto[campo] !== undefined);
    const remotoPresente = tiene(remoto, campo);
    const valorRemoto = remoto[campo];
    const valorLocal = local[campo];

    if (!remotoVacio && (!remotoPresente || valorRemoto === undefined)) {
      poner(campo, valorLocal);
      continue;
    }

    if (campo === 'estado') {
      const estadoLocal = local.estado;
      const estadoRemoto = remoto.estado;
      if (estadoRemoto === undefined) {
        resultado.estado = estadoLocal;
        continue;
      }

      const remotoFinal =
        estadoRemoto === 'FACTURADO' ||
        estadoRemoto === 'DISPOSICION_FINAL' ||
        estadoRemoto === 'ANULADO';
      const localCambio = localSucio || !mismoValor(estadoLocal, local.base.estado);

      if (!localCambio || remotoFinal) {
        resultado.estado = estadoRemoto;
        sucios.delete('estado');
        continue;
      }

      if (mismoValor(estadoLocal, estadoRemoto)) {
        sucios.delete('estado');
        resultado.estado = estadoLocal;
        continue;
      }

      const avanceLocal = indiceEstado(estadoLocal);
      const avanceRemoto = indiceEstado(estadoRemoto);

      if (avanceRemoto > avanceLocal) {
        resultado.estado = estadoRemoto;
        sucios.delete('estado');
      } else {
        resultado.estado = estadoLocal;
        if (avanceLocal === avanceRemoto) {
          conflictos.push({ campo, local: estadoLocal, remoto: estadoRemoto });
        }
      }
      continue;
    }

    if (!localSucio) {
      poner(campo, valorRemoto);
      continue;
    }

    if (mismoValor(valorRemoto, local.base[campo])) {
      poner(campo, valorLocal);
      continue;
    }

    if (mismoValor(valorLocal, valorRemoto)) {
      poner(campo, valorRemoto);
      sucios.delete(campo);
      continue;
    }

    poner(campo, valorLocal);
    conflictos.push({ campo, local: valorLocal, remoto: valorRemoto });
  }

  if (!estadoCoherente(resultado)) {
    if (!conflictos.some((conflicto) => conflicto.campo === 'estado')) {
      conflictos.push({ campo: 'estado', local: local.estado, remoto: remoto.estado });
    }
    if (tiene(remoto, 'estado')) {
      resultado.estado = remoto.estado as CamposServicio['estado'];
    }
    sucios.add('estado');
  }

  const base: Partial<CamposServicio> = {};
  for (const campo of CAMPOS_SERVICIO) {
    if (tiene(remoto, campo)) base[campo] = remoto[campo] as never;
  }

  resultado.base = base;
  resultado.camposSucios = [...sucios];
  resultado.conflictos = conflictos;
  resultado.codigo = generarCodigo(resultado);
  resultado.syncState = conflictos.length > 0 ? 'conflict' : sucios.size > 0 ? 'pending' : 'synced';

  if (remoto.eTag && resultado.sp) {
    resultado.sp = { ...resultado.sp, eTag: remoto.eTag };
  }

  return { servicio: resultado, conflictos };
};
