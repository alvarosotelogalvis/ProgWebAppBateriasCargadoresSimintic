import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { Servicio } from '@/domain/servicio';

/**
 * "Reintentar" manual (ES-005-17, ES-005-18): reinicia el contador de intentos y
 * devuelve el servicio a la cola. No sincroniza; la subida ocurre cuando el usuario
 * confirma. Devuelve `false` si el servicio no existe o no está en error.
 */
export async function reintentarServicio(
  servicios: ServicioRepository,
  servicioId: string
): Promise<boolean> {
  const actual = await servicios.obtener(servicioId);
  if (actual?.syncState !== 'error') return false;

  const guardado: Servicio = { ...actual, syncState: 'pending', intentos: 0 };
  delete guardado.proximoIntentoEn;
  delete guardado.ultimoError;
  await servicios.guardar(guardado);
  return true;
}
