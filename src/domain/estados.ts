import type { Adjunto } from './adjunto';
import type { ConfigApp } from './config';
import type { CamposServicio, EstadoServicio, Rol, Servicio, TipoAdjunto } from './servicio';
import type { ErrorValidacion } from './errores';
import { EstadoFinalError, SinPermisoError, TransicionInvalidaError } from './errores';
import {
  esquemaAnulacion,
  esquemaCotizacion,
  esquemaDiagnostico,
  esquemaDisposicionFinal,
  esquemaEntrega,
  esquemaFacturacion,
  esquemaOrdenTrabajo,
  esquemaRecepcion,
  fechaLocalHoy,
} from './validaciones';

export const ORDEN_ESTADOS: readonly EstadoServicio[] = [
  'BORRADOR',
  'RECIBIDO',
  'DIAGNOSTICADO',
  'COTIZADO',
  'EN_REPARACION',
  'ENTREGADO',
  'FACTURADO',
  'DISPOSICION_FINAL',
  'ANULADO',
  'DESCONOCIDO',
];

export const ESTADOS_FINALES: readonly EstadoServicio[] = [
  'FACTURADO',
  'DISPOSICION_FINAL',
  'ANULADO',
];

export const esFinal = (estado: EstadoServicio): boolean => ESTADOS_FINALES.includes(estado);

export const indiceEstado = (estado: EstadoServicio): number => ORDEN_ESTADOS.indexOf(estado);

export type AccionEtapa =
  | 'completarRecepcion'
  | 'completarDiagnostico'
  | 'registrarDisposicionFinal'
  | 'registrarCotizacion'
  | 'generarOT'
  | 'registrarEntrega'
  | 'registrarEntregaSinReparacion'
  | 'registrarFacturacion'
  | 'anular';

export interface Transicion {
  desde: EstadoServicio;
  hacia: EstadoServicio;
  accion: AccionEtapa;
  roles: readonly Rol[];
  requisitos: (s: Servicio, adj: readonly Adjunto[], cfg: ConfigApp) => ErrorValidacion[];
}

const CAMPOS_RECEPCION: readonly (keyof CamposServicio)[] = [
  'tipoEquipo',
  'fechaRecepcion',
  'clienteId',
  'clienteNombre',
  'numeroSolicitud',
  'marca',
  'referencia',
  'serie',
];

const CAMPOS_DIAGNOSTICO: readonly (keyof CamposServicio)[] = [
  'diagnostico',
  'observacionTecnica',
  'fechaSocializacionDF',
];

const CAMPOS_COTIZACION: readonly (keyof CamposServicio)[] = [
  'cotizacionFechaEnvio',
  'cotizacionValor',
  'cotizacionEstado',
];

const CAMPOS_OT: readonly (keyof CamposServicio)[] = ['otDetalle', 'otCostoReparacion'];

const CAMPOS_ENTREGA: readonly (keyof CamposServicio)[] = ['fechaEntrega', 'proyeccionVidaUtil'];

const CAMPOS_FACTURA: readonly (keyof CamposServicio)[] = ['facturaFecha', 'facturaNumero'];

const CAMPOS_ANULACION: readonly (keyof CamposServicio)[] = ['anulacionMotivo', 'anulacionFecha'];

const CAMPOS_POR_DESTINO: Readonly<Record<EstadoServicio, readonly (keyof CamposServicio)[]>> = {
  BORRADOR: [],
  RECIBIDO: CAMPOS_RECEPCION,
  DIAGNOSTICADO: ['diagnostico', 'observacionTecnica'],
  COTIZADO: CAMPOS_COTIZACION,
  EN_REPARACION: CAMPOS_OT,
  ENTREGADO: CAMPOS_ENTREGA,
  FACTURADO: CAMPOS_FACTURA,
  DISPOSICION_FINAL: CAMPOS_DIAGNOSTICO,
  ANULADO: CAMPOS_ANULACION,
  DESCONOCIDO: [],
};

const CAMPOS_ETAPA_ACTUAL: Readonly<Record<EstadoServicio, readonly (keyof CamposServicio)[]>> = {
  BORRADOR: CAMPOS_RECEPCION,
  RECIBIDO: CAMPOS_DIAGNOSTICO,
  DIAGNOSTICADO: CAMPOS_COTIZACION,
  COTIZADO: [...CAMPOS_OT, ...CAMPOS_ENTREGA],
  EN_REPARACION: CAMPOS_ENTREGA,
  ENTREGADO: CAMPOS_FACTURA,
  FACTURADO: [],
  DISPOSICION_FINAL: [],
  ANULADO: [],
  DESCONOCIDO: [],
};

const CAMPOS_ETAPAS_PASADAS: Readonly<Record<EstadoServicio, readonly (keyof CamposServicio)[]>> = {
  BORRADOR: [],
  RECIBIDO: CAMPOS_RECEPCION,
  DIAGNOSTICADO: [...CAMPOS_RECEPCION, ...CAMPOS_DIAGNOSTICO],
  COTIZADO: [...CAMPOS_RECEPCION, ...CAMPOS_DIAGNOSTICO],
  EN_REPARACION: [...CAMPOS_RECEPCION, ...CAMPOS_DIAGNOSTICO, ...CAMPOS_COTIZACION],
  ENTREGADO: [...CAMPOS_RECEPCION, ...CAMPOS_DIAGNOSTICO, ...CAMPOS_COTIZACION, ...CAMPOS_OT],
  FACTURADO: [
    ...CAMPOS_RECEPCION,
    ...CAMPOS_DIAGNOSTICO,
    ...CAMPOS_COTIZACION,
    ...CAMPOS_OT,
    ...CAMPOS_ENTREGA,
  ],
  DISPOSICION_FINAL: [...CAMPOS_RECEPCION, ...CAMPOS_DIAGNOSTICO],
  ANULADO: [
    ...CAMPOS_RECEPCION,
    ...CAMPOS_DIAGNOSTICO,
    ...CAMPOS_COTIZACION,
    ...CAMPOS_OT,
    ...CAMPOS_ENTREGA,
    ...CAMPOS_FACTURA,
    ...CAMPOS_ANULACION,
  ],
  DESCONOCIDO: [],
};

export const TODOS_LOS_CAMPOS: readonly (keyof CamposServicio)[] = [
  ...CAMPOS_RECEPCION,
  'diagnostico',
  'observacionTecnica',
  'fechaSocializacionDF',
  'cotizacionFechaEnvio',
  'cotizacionValor',
  'cotizacionEstado',
  'otDetalle',
  'otCostoReparacion',
  'fechaEntrega',
  'proyeccionVidaUtil',
  'facturaFecha',
  'facturaNumero',
  'anulacionMotivo',
  'anulacionFecha',
];

const resultadoEsquema = (resultado: {
  success: boolean;
  error?: { issues: Array<{ path: (string | number)[]; message: string }> };
}): ErrorValidacion[] => {
  if (resultado.success || !resultado.error) return [];
  const vistos = new Set<string>();
  const errores: ErrorValidacion[] = [];
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0];
    const error: ErrorValidacion = {
      clave: issue.message,
      ...(campo !== undefined ? { campo: String(campo) } : {}),
    };
    const huella = `${error.campo ?? ''}|${error.clave}`;
    if (vistos.has(huella)) continue;
    vistos.add(huella);
    errores.push(error);
  }
  return errores;
};

const contarAdjuntos = (
  servicio: Servicio,
  adjuntos: readonly Adjunto[],
  tipo: TipoAdjunto
): number =>
  adjuntos.filter(
    (adjunto) =>
      adjunto.servicioId === servicio.id && adjunto.tipo === tipo && !adjunto.eliminarRemoto
  ).length;

const validarCantidadAdjuntos = (
  servicio: Servicio,
  adjuntos: readonly Adjunto[],
  tipo: TipoAdjunto,
  minimo: number,
  maximo: number
): ErrorValidacion[] => {
  const errores: ErrorValidacion[] = [];
  const cantidad = contarAdjuntos(servicio, adjuntos, tipo);
  if (cantidad < minimo) {
    errores.push({ adjunto: tipo, clave: 'errores.adjunto.min' });
  }
  if (cantidad > maximo) {
    errores.push({ adjunto: tipo, clave: 'errores.adjunto.max' });
  }
  return errores;
};

const requisitosRecepcion = (
  s: Servicio,
  adj: readonly Adjunto[],
  cfg: ConfigApp,
  hoy: string
): ErrorValidacion[] => [
  ...resultadoEsquema(esquemaRecepcion(hoy).safeParse(s)),
  ...validarCantidadAdjuntos(s, adj, 'FOTO_INGRESO', cfg.minFotosIngreso, cfg.maxFotosIngreso),
];

const requisitosDiagnostico = (
  s: Servicio,
  adj: readonly Adjunto[],
  cfg: ConfigApp
): ErrorValidacion[] => {
  const errores = resultadoEsquema(esquemaDiagnostico().safeParse(s));
  if (s.diagnostico === cfg.diagnosticoValorDisposicionFinal) {
    errores.push({
      campo: 'diagnostico',
      clave: 'errores.servicio.diagnosticoEsDisposicionFinal',
    });
  }
  errores.push(
    ...validarCantidadAdjuntos(s, adj, 'FORMATO_DIAGNOSTICO', 1, Number.MAX_SAFE_INTEGER)
  );
  return errores;
};

const requisitosDisposicionFinal = (
  s: Servicio,
  adj: readonly Adjunto[],
  cfg: ConfigApp,
  hoy: string
): ErrorValidacion[] => {
  const errores = resultadoEsquema(esquemaDisposicionFinal(hoy, s.fechaRecepcion).safeParse(s));
  if (s.diagnostico !== cfg.diagnosticoValorDisposicionFinal) {
    errores.push({
      campo: 'diagnostico',
      clave: 'errores.servicio.diagnosticoNoDisposicionFinal',
    });
  }
  return [
    ...errores,
    ...validarCantidadAdjuntos(s, adj, 'FORMATO_DIAGNOSTICO', 1, 1),
    ...validarCantidadAdjuntos(s, adj, 'DISPOSICION_FINAL', 1, 1),
  ];
};

const requisitosCotizacion = (
  s: Servicio,
  adj: readonly Adjunto[],
  _cfg: ConfigApp,
  hoy: string
): ErrorValidacion[] => [
  ...resultadoEsquema(esquemaCotizacion(hoy, s.fechaRecepcion).safeParse(s)),
  ...validarCantidadAdjuntos(s, adj, 'COTIZACION', 0, 1),
];

const requisitosOrdenTrabajo = (s: Servicio): ErrorValidacion[] => {
  const errores = resultadoEsquema(esquemaOrdenTrabajo().safeParse(s));
  if (s.cotizacionEstado !== 'APROBADA') {
    errores.push({
      campo: 'cotizacionEstado',
      clave: 'errores.servicio.cotizacionNoAprobada',
    });
  }
  return errores;
};

const requisitosEntrega = (
  s: Servicio,
  adj: readonly Adjunto[],
  cfg: ConfigApp,
  hoy: string,
  requiereVidaUtil: boolean
): ErrorValidacion[] => [
  ...resultadoEsquema(esquemaEntrega(hoy, s.fechaRecepcion, requiereVidaUtil).safeParse(s)),
  ...validarCantidadAdjuntos(s, adj, 'FOTO_SALIDA', cfg.minFotosSalida, cfg.maxFotosSalida),
];

const requisitosEntregaSinReparacion = (
  s: Servicio,
  adj: readonly Adjunto[],
  cfg: ConfigApp,
  hoy: string
): ErrorValidacion[] => {
  const errores = requisitosEntrega(s, adj, cfg, hoy, false);
  if (s.cotizacionEstado !== 'RECHAZADA') {
    errores.push({
      campo: 'cotizacionEstado',
      clave: 'errores.servicio.cotizacionNoRechazada',
    });
  }
  return errores;
};

const requisitosFacturacion = (
  s: Servicio,
  adj: readonly Adjunto[],
  _cfg: ConfigApp,
  hoy: string
): ErrorValidacion[] => [
  ...resultadoEsquema(esquemaFacturacion(hoy, s.fechaRecepcion).safeParse(s)),
  ...validarCantidadAdjuntos(s, adj, 'FACTURA', 1, 1),
];

const requisitosAnulacion = (s: Servicio): ErrorValidacion[] =>
  resultadoEsquema(esquemaAnulacion().safeParse(s));

export const TRANSICIONES: readonly Transicion[] = [
  {
    desde: 'BORRADOR',
    hacia: 'RECIBIDO',
    accion: 'completarRecepcion',
    roles: ['Tecnico', 'Administrador'],
    requisitos: (s, adj, cfg) => requisitosRecepcion(s, adj, cfg, fechaLocalHoy()),
  },
  {
    desde: 'RECIBIDO',
    hacia: 'DIAGNOSTICADO',
    accion: 'completarDiagnostico',
    roles: ['Tecnico', 'Administrador'],
    requisitos: (s, adj, cfg) => requisitosDiagnostico(s, adj, cfg),
  },
  {
    desde: 'RECIBIDO',
    hacia: 'DISPOSICION_FINAL',
    accion: 'registrarDisposicionFinal',
    roles: ['Tecnico', 'Administrador'],
    requisitos: (s, adj, cfg) => requisitosDisposicionFinal(s, adj, cfg, fechaLocalHoy()),
  },
  {
    desde: 'DIAGNOSTICADO',
    hacia: 'COTIZADO',
    accion: 'registrarCotizacion',
    roles: ['Comercial', 'Administrador'],
    requisitos: (s, adj, _cfg) => requisitosCotizacion(s, adj, _cfg, fechaLocalHoy()),
  },
  {
    desde: 'COTIZADO',
    hacia: 'EN_REPARACION',
    accion: 'generarOT',
    roles: ['Tecnico', 'Administrador'],
    requisitos: (s) => requisitosOrdenTrabajo(s),
  },
  {
    desde: 'COTIZADO',
    hacia: 'ENTREGADO',
    accion: 'registrarEntregaSinReparacion',
    roles: ['Tecnico', 'Administrador'],
    requisitos: (s, adj, cfg) => requisitosEntregaSinReparacion(s, adj, cfg, fechaLocalHoy()),
  },
  {
    desde: 'EN_REPARACION',
    hacia: 'ENTREGADO',
    accion: 'registrarEntrega',
    roles: ['Tecnico', 'Administrador'],
    requisitos: (s, adj, cfg) => requisitosEntrega(s, adj, cfg, fechaLocalHoy(), true),
  },
  {
    desde: 'ENTREGADO',
    hacia: 'FACTURADO',
    accion: 'registrarFacturacion',
    roles: ['Comercial', 'Administrador'],
    requisitos: (s, adj, cfg) => requisitosFacturacion(s, adj, cfg, fechaLocalHoy()),
  },
  {
    desde: 'BORRADOR',
    hacia: 'ANULADO',
    accion: 'anular',
    roles: ['Administrador'],
    requisitos: requisitosAnulacion,
  },
  {
    desde: 'RECIBIDO',
    hacia: 'ANULADO',
    accion: 'anular',
    roles: ['Administrador'],
    requisitos: requisitosAnulacion,
  },
  {
    desde: 'DIAGNOSTICADO',
    hacia: 'ANULADO',
    accion: 'anular',
    roles: ['Administrador'],
    requisitos: requisitosAnulacion,
  },
  {
    desde: 'COTIZADO',
    hacia: 'ANULADO',
    accion: 'anular',
    roles: ['Administrador'],
    requisitos: requisitosAnulacion,
  },
  {
    desde: 'EN_REPARACION',
    hacia: 'ANULADO',
    accion: 'anular',
    roles: ['Administrador'],
    requisitos: requisitosAnulacion,
  },
  {
    desde: 'ENTREGADO',
    hacia: 'ANULADO',
    accion: 'anular',
    roles: ['Administrador'],
    requisitos: requisitosAnulacion,
  },
];

const tieneRol = (roles: readonly Rol[], permitidos: readonly Rol[]): boolean =>
  roles.some((rol) => permitidos.includes(rol));

export const transicionesDisponibles = (
  s: Servicio,
  roles: readonly Rol[],
  adj: readonly Adjunto[],
  cfg: ConfigApp
): { t: Transicion; errores: ErrorValidacion[] }[] => {
  if (s.estado === 'DESCONOCIDO' || esFinal(s.estado)) return [];
  return TRANSICIONES.filter(
    (transicion) => transicion.desde === s.estado && tieneRol(roles, transicion.roles)
  ).map((t) => ({ t, errores: t.requisitos(s, adj, cfg) }));
};

const camposConValor = (
  s: Servicio,
  campos: readonly (keyof CamposServicio)[]
): (keyof CamposServicio)[] =>
  campos.filter((campo) => {
    const valor = s[campo];
    return valor !== undefined && valor !== null && valor !== '';
  });

export const aplicarTransicion = (
  s: Servicio,
  accion: AccionEtapa,
  roles: readonly Rol[],
  adj: readonly Adjunto[],
  cfg: ConfigApp,
  ahora: string
): Servicio => {
  if (s.estado === 'DESCONOCIDO') {
    throw new TransicionInvalidaError([]);
  }

  const transicion = TRANSICIONES.find(
    (candidata) => candidata.desde === s.estado && candidata.accion === accion
  );

  if (!transicion) {
    if (esFinal(s.estado)) throw new EstadoFinalError();
    throw new TransicionInvalidaError();
  }

  if (!tieneRol(roles, transicion.roles)) {
    throw new SinPermisoError();
  }

  const errores = transicion.requisitos(s, adj, cfg);
  if (errores.length > 0) {
    throw new TransicionInvalidaError(errores);
  }

  const cambios: Partial<Servicio> = {
    estado: transicion.hacia,
    actualizadoEn: ahora,
    syncState: 'pending',
  };

  if (accion === 'registrarCotizacion' && !s.cotizacionEstado) {
    cambios.cotizacionEstado = 'PENDIENTE';
  }
  if (accion === 'anular') {
    cambios.anulacionFecha = ahora.slice(0, 10);
  }

  const resultado: Servicio = { ...s, ...cambios };
  const sucios = new Set<keyof CamposServicio>(s.camposSucios);
  sucios.add('estado');
  for (const campo of camposConValor(resultado, CAMPOS_POR_DESTINO[transicion.hacia])) {
    sucios.add(campo);
  }

  return { ...resultado, camposSucios: [...sucios] };
};

export const rolesTransicionSiguiente = (estado: EstadoServicio): readonly Rol[] => {
  const roles = new Set<Rol>();
  for (const transicion of TRANSICIONES) {
    if (transicion.desde !== estado || transicion.accion === 'anular') continue;
    for (const rol of transicion.roles) roles.add(rol);
  }
  return [...roles];
};

export const camposEditables = (
  s: Servicio,
  roles: readonly Rol[]
): ReadonlySet<keyof CamposServicio> => {
  const editables = new Set<keyof CamposServicio>();
  if (s.estado === 'DESCONOCIDO' || roles.length === 0) return editables;

  const esAdmin = roles.includes('Administrador');

  if (esFinal(s.estado)) {
    if (esAdmin) {
      for (const campo of TODOS_LOS_CAMPOS) {
        if (campo === 'anulacionMotivo' || campo === 'anulacionFecha') continue;
        editables.add(campo);
      }
      if (s.estado === 'ANULADO') {
        editables.add('anulacionMotivo');
        editables.add('anulacionFecha');
      }
    }
    return editables;
  }

  if (esAdmin) {
    for (const campo of CAMPOS_ETAPAS_PASADAS[s.estado]) editables.add(campo);
    for (const campo of CAMPOS_ETAPA_ACTUAL[s.estado]) editables.add(campo);
    return editables;
  }

  const rolesSiguientes = rolesTransicionSiguiente(s.estado);
  if (tieneRol(roles, rolesSiguientes)) {
    for (const campo of CAMPOS_ETAPA_ACTUAL[s.estado]) editables.add(campo);
  }
  return editables;
};
