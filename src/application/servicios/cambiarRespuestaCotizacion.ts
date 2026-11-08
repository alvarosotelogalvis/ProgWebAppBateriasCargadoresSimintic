import type { Servicio, Rol } from '@/domain/servicio';
import type { AppDatabase } from '@/infrastructure/db/AppDatabase';

export type CambiarRespuestaCotizacionResultado =
  | {
      ok: true;
      servicio: Servicio;
    }
  | {
      ok: false;
      error: 'NO_EN_COTIZADO' | 'SIN_PERMISO' | 'NO_ENCONTRADO';
    };

export async function cambiarRespuestaCotizacion(
  servicioId: string,
  nuevaRespuesta: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA',
  rolUsuario: Rol,
  db: AppDatabase
): Promise<CambiarRespuestaCotizacionResultado> {
  const servicio = await db.servicios.get(servicioId);
  if (!servicio) {
    return { ok: false, error: 'NO_ENCONTRADO' };
  }

  if (servicio.estado !== 'COTIZADO') {
    return { ok: false, error: 'NO_EN_COTIZADO' };
  }

  if (!['Comercial', 'Administrador'].includes(rolUsuario)) {
    return { ok: false, error: 'SIN_PERMISO' };
  }

  const actualizado: Servicio = {
    ...servicio,
    cotizacionEstado: nuevaRespuesta,
    actualizadoEn: new Date().toISOString(),
    syncState: 'pending',
  };

  await db.servicios.put(actualizado);

  return {
    ok: true,
    servicio: actualizado,
  };
}
