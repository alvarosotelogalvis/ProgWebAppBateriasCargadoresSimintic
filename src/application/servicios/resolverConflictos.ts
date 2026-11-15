import type { Clock } from '@/application/ports/clock';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import { ValidacionError } from '@/domain/errores';
import { CAMPOS_SERVICIO, type CamposServicio, type Servicio } from '@/domain/servicio';

/** Elección del usuario para un campo en conflicto. */
export interface Eleccion {
  readonly campo: keyof CamposServicio;
  readonly usar: 'LOCAL' | 'REMOTO';
}

export type ResolverConflictos = (
  servicioId: string,
  elecciones: readonly Eleccion[]
) => Promise<void>;

/**
 * Aplica las elecciones del usuario a un servicio en conflicto (FR-006-08, FR-006-09).
 * - Exige una elección por cada campo en conflicto.
 * - `LOCAL` conserva el valor del dispositivo y lo deja pendiente de subir.
 * - `REMOTO` toma el valor de SharePoint y lo marca como ya sincronizado.
 * El servicio queda `pending` (o `synced` si no queda nada por subir); no sincroniza por sí mismo.
 */
export function crearResolverConflictos(deps: {
  readonly servicios: ServicioRepository;
  readonly clock: Clock;
}): ResolverConflictos {
  return async (servicioId, elecciones) => {
    const servicio = await deps.servicios.obtener(servicioId);
    if (!servicio) {
      throw new ValidacionError([{ clave: 'errores.servicio.noEncontrado' }]);
    }

    const faltantes = servicio.conflictos.filter(
      (conflicto) => !elecciones.some((eleccion) => eleccion.campo === conflicto.campo)
    );
    if (faltantes.length > 0) {
      throw new ValidacionError(
        faltantes.map((conflicto) => ({
          campo: conflicto.campo,
          clave: 'errores.conflicto.faltaEleccion',
        }))
      );
    }

    // Eliminación remota con cambios locales: el único «conflicto» es el estado sin valor remoto.
    const eliminacion = servicio.conflictos.find(
      (conflicto) => conflicto.campo === 'estado' && conflicto.remoto === undefined
    );
    if (eliminacion) {
      const eleccion = elecciones.find((e) => e.campo === 'estado');
      if (eleccion?.usar === 'REMOTO') {
        // Se acepta la eliminación: queda sin pendientes y se borra la copia local.
        await deps.servicios.guardar({
          ...servicio,
          conflictos: [],
          camposSucios: [],
          syncState: 'synced',
        });
        await deps.servicios.eliminarSincronizado(servicio.id);
        return;
      }
      // Se conserva la copia local: se vuelve a crear en SharePoint con todos sus campos.
      const { sp: _sp, ...sinRemoto } = servicio;
      await deps.servicios.guardar({
        ...sinRemoto,
        base: {},
        conflictos: [],
        camposSucios: CAMPOS_SERVICIO.filter((campo) => servicio[campo] !== undefined),
        syncState: 'pending',
        intentos: 0,
        actualizadoEn: deps.clock.ahoraIso(),
      });
      return;
    }

    const valores: Record<string, unknown> = { ...servicio };
    const base: Record<string, unknown> = { ...servicio.base };
    const sucios = new Set<keyof CamposServicio>(servicio.camposSucios);

    for (const conflicto of servicio.conflictos) {
      const eleccion = elecciones.find((e) => e.campo === conflicto.campo);
      if (!eleccion) continue;
      if (eleccion.usar === 'LOCAL') {
        valores[conflicto.campo] = conflicto.local;
        sucios.add(conflicto.campo);
      } else {
        valores[conflicto.campo] = conflicto.remoto;
        base[conflicto.campo] = conflicto.remoto;
        sucios.delete(conflicto.campo);
      }
    }

    // Una elección que deja el valor en `undefined` borra la clave para no guardar undefined.
    for (const clave of Object.keys(valores)) {
      if (valores[clave] === undefined) delete valores[clave];
    }

    const resuelto = {
      ...(valores as unknown as Servicio),
      base: base as Servicio['base'],
      conflictos: [],
      camposSucios: [...sucios],
      syncState: sucios.size > 0 ? 'pending' : 'synced',
      intentos: 0,
      actualizadoEn: deps.clock.ahoraIso(),
    } satisfies Servicio;

    await deps.servicios.guardar(resuelto);
  };
}
