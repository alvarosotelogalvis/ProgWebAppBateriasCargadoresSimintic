import { rolesTransicionSiguiente, TRANSICIONES } from '@/domain/estados';
import type { AccionEtapa } from '@/domain/estados';
import type { EstadoServicio, Rol } from '@/domain/servicio';

/** Segmento de ruta `/servicios/:id/etapa/<ruta>` de cada pantalla de etapa. */
export type RutaEtapa = 'diagnostico' | 'cotizacion' | 'orden-trabajo' | 'entrega' | 'facturacion';

const RUTA_POR_ACCION: Partial<Record<AccionEtapa, RutaEtapa>> = {
  completarDiagnostico: 'diagnostico',
  registrarDisposicionFinal: 'diagnostico', // misma pantalla: la rama DF depende del diagnóstico
  registrarCotizacion: 'cotizacion',
  generarOT: 'orden-trabajo',
  registrarEntregaSinReparacion: 'entrega',
  registrarEntrega: 'entrega',
  registrarFacturacion: 'facturacion',
};

/**
 * Pantallas de etapa a las que puede ir el usuario desde un servicio en `estado`.
 * La recepción (BORRADOR) se completa desde su propia pantalla y anular tiene su diálogo.
 */
export const etapasSiguientes = (
  estado: EstadoServicio,
  roles: readonly Rol[]
): readonly RutaEtapa[] => {
  const rutas: RutaEtapa[] = [];
  for (const transicion of TRANSICIONES) {
    if (transicion.desde !== estado) continue;
    if (!transicion.roles.some((rol) => roles.includes(rol))) continue;
    const ruta = RUTA_POR_ACCION[transicion.accion];
    if (ruta && !rutas.includes(ruta)) rutas.push(ruta);
  }
  return rutas;
};

/** Roles que pueden avanzar el servicio (para el aviso "Pendiente de <rol>"). */
export const rolesPendientes = (estado: EstadoServicio): readonly Rol[] =>
  rolesTransicionSiguiente(estado);
