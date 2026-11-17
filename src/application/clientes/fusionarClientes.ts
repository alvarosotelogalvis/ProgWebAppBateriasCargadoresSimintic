import type { ClientesRemotos } from '@/application/ports/clientesRemotos';
import type { Logger } from '@/application/ports/loggerPort';
import { resolverVigente, type ClienteFusionado } from '@/domain/cliente';
import { SinPermisoError } from '@/domain/errores';
import type { Rol } from '@/domain/servicio';

export type MotivoFusionInvalida =
  'MISMO' | 'NO_ENCONTRADO' | 'ORIGEN_FUSIONADO' | 'DESTINO_INACTIVO' | 'CICLO' | 'INCOMPLETA';

/** La fusión pedida no se puede hacer (o no terminó): el origen sigue activo y se puede repetir. */
export class FusionInvalidaError extends Error {
  readonly motivo: MotivoFusionInvalida;

  constructor(motivo: MotivoFusionInvalida) {
    super(`Fusión de clientes no válida: ${motivo}`);
    this.name = 'FusionInvalidaError';
    this.motivo = motivo;
  }
}

export interface DepsFusionarClientes {
  readonly clientesRemotos: ClientesRemotos;
  readonly logger: Logger;
  readonly cuentaActiva: () => { readonly correo: string } | null | undefined;
  /** Relee el catálogo local al terminar (best-effort). */
  readonly refrescarCatalogos?: () => Promise<unknown>;
}

export interface OpcionesFusion {
  readonly origenId: number;
  readonly destinoId: number;
  readonly roles: readonly Rol[];
  readonly onProgreso?: (hechos: number, total: number) => void;
}

export interface ResultadoFusion {
  /** Servicios que se pasaron al cliente destino en esta ejecución. */
  readonly reasignados: number;
  /** El cliente que quedó: el destino pedido o, si ese ya se había fusionado, el vigente. */
  readonly destinoId: number;
  readonly origenNombre: string;
  readonly destinoNombre: string;
}

const CONCURRENCIA = 3;
const MAX_PASADAS = 3;

/** Ejecuta `tarea` sobre cada elemento con un máximo de peticiones simultáneas; el primer fallo detiene el reparto. */
async function enParalelo<T>(
  elementos: readonly T[],
  limite: number,
  tarea: (elemento: T) => Promise<void>
): Promise<void> {
  let siguiente = 0;
  let fallo: unknown;
  let fallido = false;
  const trabajador = async (): Promise<void> => {
    while (!fallido) {
      const indice = siguiente;
      siguiente += 1;
      const elemento = elementos[indice];
      if (elemento === undefined) return;
      try {
        await tarea(elemento);
      } catch (error) {
        fallo = error;
        fallido = true;
        return;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, elementos.length) }, trabajador));
  if (fallido) throw fallo;
}

/**
 * Fusiona un cliente (origen) en otro (destino) — ADR-0023. Solo el Administrador y con conexión.
 *
 * Reasigna en SharePoint todos los servicios del origen al destino y, **al final**, deja el origen
 * `Activo = No` con `FusionadoConId`; nunca lo borra (se conserva como historial). Es reanudable: los
 * servicios se vuelven a consultar en cada pasada, así que tras un corte basta repetirla y termina lo que
 * faltaba. Si el destino ya se había fusionado en otro, se usa el cliente vigente.
 */
export const crearFusionarClientes =
  (deps: DepsFusionarClientes) =>
  async (opciones: OpcionesFusion): Promise<ResultadoFusion> => {
    if (!opciones.roles.includes('Administrador')) throw new SinPermisoError();
    if (opciones.origenId === opciones.destinoId) throw new FusionInvalidaError('MISMO');

    const todos = await deps.clientesRemotos.listarClientes();
    const origen = todos.find((cliente) => cliente.id === opciones.origenId);
    const elegido = todos.find((cliente) => cliente.id === opciones.destinoId);
    if (!origen || !elegido) throw new FusionInvalidaError('NO_ENCONTRADO');
    if (!origen.activo && origen.fusionadoCon !== undefined) {
      throw new FusionInvalidaError('ORIGEN_FUSIONADO');
    }

    const fusionados: ClienteFusionado[] = todos.flatMap((cliente) =>
      !cliente.activo && cliente.fusionadoCon !== undefined
        ? [{ origenId: cliente.id, destinoId: cliente.fusionadoCon }]
        : []
    );
    const vigenteId = resolverVigente(elegido.id, fusionados);
    if (vigenteId === origen.id) throw new FusionInvalidaError('CICLO');
    const destino = todos.find((cliente) => cliente.id === vigenteId) ?? elegido;
    if (!destino.activo) throw new FusionInvalidaError('DESTINO_INACTIVO');

    let reasignados = 0;
    let total = 0;
    for (let pasada = 1; pasada <= MAX_PASADAS; pasada += 1) {
      const lote = await deps.clientesRemotos.listarServiciosDeCliente(origen.id);
      if (lote.length === 0) break;
      total += lote.length;
      await enParalelo(lote, CONCURRENCIA, async (servicio) => {
        await deps.clientesRemotos.reasignarServicio(servicio.itemId, destino.id);
        reasignados += 1;
        opciones.onProgreso?.(reasignados, total);
      });
    }
    // Si alguien sigue creando servicios del origen, no se desactiva: se puede repetir.
    const quedan = await deps.clientesRemotos.listarServiciosDeCliente(origen.id);
    if (quedan.length > 0) throw new FusionInvalidaError('INCOMPLETA');

    await deps.clientesRemotos.desactivarFusionado(origen.id, destino.id);

    const usuario = deps.cuentaActiva()?.correo ?? 'desconocido';
    deps.logger.info('clientes.fusionados', {
      origenId: origen.id,
      destinoId: destino.id,
      servicios: reasignados,
    });
    try {
      await deps.clientesRemotos.registrarDetalleLog({
        tipo: 'Fusión de clientes',
        detalle: `${origen.nombre} (${origen.id}) → ${destino.nombre} (${destino.id}): ${reasignados} ${
          reasignados === 1 ? 'servicio' : 'servicios'
        }, por ${usuario}`,
      });
    } catch (causa) {
      // La bitácora es best-effort: su fallo nunca deshace una fusión ya hecha.
      deps.logger.warn('clientes.fusion.log.fallo', {
        mensaje: causa instanceof Error ? causa.message : String(causa),
      });
    }
    try {
      await deps.refrescarCatalogos?.();
    } catch (causa) {
      deps.logger.warn('clientes.fusion.refresco.fallo', {
        mensaje: causa instanceof Error ? causa.message : String(causa),
      });
    }

    return {
      reasignados,
      destinoId: destino.id,
      origenNombre: origen.nombre,
      destinoNombre: destino.nombre,
    };
  };
