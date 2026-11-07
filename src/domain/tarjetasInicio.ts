import type { Rol, FiltroServicios } from './servicio';

export interface TarjetaInicio {
  clave: string;
  labelI18n: string;
  filtro: FiltroServicios;
  badge?: number;
}

/**
 * Calcula las tarjetas de trabajo que debe ver un usuario según sus roles.
 * Evita duplicados: si una tarjeta aparece en múltiples roles, solo sale una vez.
 */
export function tarjetasPorRol(roles: readonly Rol[]): TarjetaInicio[] {
  const tarjetas = new Map<string, TarjetaInicio>();

  if (roles.includes('Tecnico')) {
    // Borradores: registros sin completar recepción
    tarjetas.set('borradores', {
      clave: 'borradores',
      labelI18n: 'tareas.diagnostico',
      filtro: { estados: ['BORRADOR'] },
    });

    // Recibidos (por diagnosticar)
    tarjetas.set('recibidos', {
      clave: 'recibidos',
      labelI18n: 'tareas.diagnostico',
      filtro: { estados: ['RECIBIDO'] },
    });

    // Cotizados aprobados (por crear OT)
    tarjetas.set('porOT', {
      clave: 'porOT',
      labelI18n: 'tareas.ordenTrabajo',
      filtro: { estados: ['COTIZADO'] }, // filtro refinado: solo Aprobados en lógica de aplicación
    });

    // En reparación (por entregar)
    tarjetas.set('porEntregar', {
      clave: 'porEntregar',
      labelI18n: 'tareas.entregar',
      filtro: { estados: ['EN_REPARACION'] },
    });
  }

  if (roles.includes('Comercial')) {
    // Diagnosticados (por cotizar)
    tarjetas.set('porCotizar', {
      clave: 'porCotizar',
      labelI18n: 'tareas.cotizar',
      filtro: { estados: ['DIAGNOSTICADO'] },
    });

    // Cotizados (respondiendo)
    tarjetas.set('cotizandoRespuesta', {
      clave: 'cotizandoRespuesta',
      labelI18n: 'etapas.cotizacion.respuestaPendiente',
      filtro: { estados: ['COTIZADO'] },
    });

    // Entregados (por facturar)
    tarjetas.set('porFacturar', {
      clave: 'porFacturar',
      labelI18n: 'tareas.facturar',
      filtro: { estados: ['ENTREGADO'] },
    });
  }

  if (roles.includes('Administrador')) {
    // Los administradores ven todo, pero no duplicamos
    // (las otras tarjetas los incluyen en sus roles permitidos)
  }

  return [...tarjetas.values()];
}
