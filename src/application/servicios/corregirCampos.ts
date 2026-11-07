import type { Servicio, Rol, CamposServicio } from '@/domain/servicio';
import type { AppDatabase } from '@/infrastructure/db/AppDatabase';
import { camposEditables } from '@/domain/estados';

export type CorregirCamposResultado =
  | {
      ok: true;
      servicio: Servicio;
    }
  | {
      ok: false;
      error: 'SIN_PERMISO' | 'NO_ENCONTRADO' | 'CAMPO_NO_EDITABLE';
    };

export async function corregirCampos(
  servicioId: string,
  cambios: Partial<CamposServicio>,
  rolUsuario: Rol,
  db: AppDatabase
): Promise<CorregirCamposResultado> {
  if (rolUsuario !== 'Administrador') {
    return { ok: false, error: 'SIN_PERMISO' };
  }

  const servicio = await db.servicios.get(servicioId);
  if (!servicio) {
    return { ok: false, error: 'NO_ENCONTRADO' };
  }

  const camposPermitidos = camposEditables(servicio.estado, rolUsuario);
  for (const campo of Object.keys(cambios)) {
    if (!camposPermitidos.includes(campo as keyof CamposServicio)) {
      return { ok: false, error: 'CAMPO_NO_EDITABLE' };
    }
  }

  const actualizado: Servicio = {
    ...servicio,
    ...cambios,
    actualizadoEn: new Date().toISOString(),
    syncState: 'pending',
  };

  await db.servicios.put(actualizado);

  return {
    ok: true,
    servicio: actualizado,
  };
}
