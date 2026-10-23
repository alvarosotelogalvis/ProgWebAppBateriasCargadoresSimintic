import { esFinal } from '@/domain/estados';
import type { Servicio, TipoEquipo } from '@/domain/servicio';

export interface FiltrosServicios {
  texto?: string;
  estados?: readonly Servicio['estado'][];
  soloPendientes?: boolean;
  clienteId?: number;
  tipoEquipo?: TipoEquipo;
  fechaDesde?: string;
  fechaHasta?: string;
}

const sinTildes = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const filtrarServicios = (
  servicios: readonly Servicio[],
  filtros: FiltrosServicios
): Servicio[] => {
  const texto = sinTildes(filtros.texto?.trim() ?? '');
  return servicios.filter((servicio) => {
    if (texto) {
      const campos = [
        servicio.codigo,
        servicio.serie,
        String(servicio.numeroSolicitud),
        servicio.clienteNombre,
        servicio.referencia,
        servicio.marca,
      ];
      if (!campos.some((campo) => sinTildes(campo).includes(texto))) return false;
    }
    if (filtros.estados?.length && !filtros.estados.includes(servicio.estado)) return false;
    if (filtros.soloPendientes && !['pending', 'error', 'conflict'].includes(servicio.syncState)) {
      return false;
    }
    if (filtros.clienteId && servicio.clienteId !== filtros.clienteId) return false;
    if (filtros.tipoEquipo && servicio.tipoEquipo !== filtros.tipoEquipo) return false;
    if (filtros.fechaDesde && servicio.fechaRecepcion < filtros.fechaDesde) return false;
    if (filtros.fechaHasta && servicio.fechaRecepcion > filtros.fechaHasta) return false;
    return true;
  });
};

export const detectarSerieDuplicada = async (
  buscarPorSerie: (serie: string) => Promise<Servicio[]>,
  servicioId: string,
  serie: string,
  numeroSolicitud: number
): Promise<Servicio | undefined> => {
  if (!serie.trim() || !numeroSolicitud) return undefined;
  const candidatos = await buscarPorSerie(serie);
  return candidatos.find(
    (candidato) =>
      candidato.id !== servicioId &&
      candidato.numeroSolicitud === numeroSolicitud &&
      !esFinal(candidato.estado)
  );
};
