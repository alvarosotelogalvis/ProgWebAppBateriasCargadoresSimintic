import { describe, expect, it } from 'vitest';

import { adjuntoBuilder } from '../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../tests/builders/servicioBuilder';
import type { Adjunto } from './adjunto';
import { CONFIG_DEFECTO } from './config';
import { EstadoFinalError, SinPermisoError, TransicionInvalidaError } from './errores';
import {
  aplicarTransicion,
  rolesTransicionSiguiente,
  TRANSICIONES,
  transicionesDisponibles,
  type AccionEtapa,
} from './estados';
import type { CamposServicio, EstadoServicio, Rol, Servicio, TipoAdjunto } from './servicio';

const AHORA = '2026-10-21T08:00:00.000Z';
const NO_FINALES: EstadoServicio[] = [
  'BORRADOR',
  'RECIBIDO',
  'DIAGNOSTICADO',
  'COTIZADO',
  'EN_REPARACION',
  'ENTREGADO',
];

const con = (base: Servicio, campos: Partial<CamposServicio>): Servicio => ({ ...base, ...campos });
const adj = (servicio: Servicio, ...tipos: TipoAdjunto[]): Adjunto[] =>
  tipos.map((tipo, i) =>
    adjuntoBuilder({ id: `adj-${i}`, servicioId: servicio.id, tipo }).construir()
  );

interface Caso {
  readonly nombre: string;
  readonly servicio: Servicio;
  readonly accion: AccionEtapa;
  readonly rol: Rol;
  readonly adjuntos: TipoAdjunto[];
  readonly hacia: EstadoServicio;
  /** Qué quitar para que falle el requisito (campo o adjunto). */
  readonly quitar: { campo?: keyof CamposServicio; adjunto?: TipoAdjunto };
}

const borrador = (): Servicio => ({
  ...servicioBuilder().recibido().construir(),
  estado: 'BORRADOR',
});
const recibido = () => servicioBuilder().recibido().construir();

const CASOS: Caso[] = [
  {
    nombre: 'BORRADOR → RECIBIDO',
    servicio: borrador(),
    accion: 'completarRecepcion',
    rol: 'Tecnico',
    adjuntos: ['FOTO_INGRESO'],
    hacia: 'RECIBIDO',
    quitar: { adjunto: 'FOTO_INGRESO' },
  },
  {
    nombre: 'RECIBIDO → DIAGNOSTICADO',
    servicio: con(recibido(), {
      diagnostico: 'Reparable',
      observacionTecnica: 'Celdas con desbalance',
    }),
    accion: 'completarDiagnostico',
    rol: 'Tecnico',
    adjuntos: ['FORMATO_DIAGNOSTICO'],
    hacia: 'DIAGNOSTICADO',
    quitar: { campo: 'observacionTecnica' },
  },
  {
    nombre: 'RECIBIDO → DISPOSICION_FINAL',
    servicio: con(recibido(), {
      diagnostico: CONFIG_DEFECTO.diagnosticoValorDisposicionFinal,
      observacionTecnica: 'Celdas irrecuperables',
      fechaSocializacionDF: '2026-10-05',
    }),
    accion: 'registrarDisposicionFinal',
    rol: 'Tecnico',
    adjuntos: ['FORMATO_DIAGNOSTICO', 'DISPOSICION_FINAL'],
    hacia: 'DISPOSICION_FINAL',
    quitar: { campo: 'fechaSocializacionDF' },
  },
  {
    nombre: 'DIAGNOSTICADO → COTIZADO',
    servicio: con(servicioBuilder().diagnosticado().construir(), {
      cotizacionFechaEnvio: '2026-10-10',
    }),
    accion: 'registrarCotizacion',
    rol: 'Comercial',
    adjuntos: [],
    hacia: 'COTIZADO',
    quitar: { campo: 'cotizacionFechaEnvio' },
  },
  {
    nombre: 'COTIZADO → EN_REPARACION (orden de trabajo)',
    servicio: con(servicioBuilder().cotizado().construir(), {
      cotizacionEstado: 'APROBADA',
      otDetalle: 'Cambio de celdas y prueba',
      otCostoReparacion: 150_000,
    }),
    accion: 'generarOT',
    rol: 'Tecnico',
    adjuntos: [],
    hacia: 'EN_REPARACION',
    quitar: { campo: 'otDetalle' },
  },
  {
    nombre: 'COTIZADO → ENTREGADO (sin reparación)',
    servicio: con(servicioBuilder().cotizado().construir(), {
      cotizacionEstado: 'RECHAZADA',
      fechaEntrega: '2026-10-15',
    }),
    accion: 'registrarEntregaSinReparacion',
    rol: 'Tecnico',
    adjuntos: ['FOTO_SALIDA'],
    hacia: 'ENTREGADO',
    quitar: { adjunto: 'FOTO_SALIDA' },
  },
  {
    nombre: 'EN_REPARACION → ENTREGADO',
    servicio: con(servicioBuilder().enReparacion().construir(), {
      fechaEntrega: '2026-10-15',
      proyeccionVidaUtil: '2027-10-15',
    }),
    accion: 'registrarEntrega',
    rol: 'Tecnico',
    adjuntos: ['FOTO_SALIDA'],
    hacia: 'ENTREGADO',
    quitar: { campo: 'proyeccionVidaUtil' },
  },
  {
    nombre: 'ENTREGADO → FACTURADO',
    servicio: con(servicioBuilder().entregado().construir(), { facturaFecha: '2026-10-16' }),
    accion: 'registrarFacturacion',
    rol: 'Comercial',
    adjuntos: ['FACTURA'],
    hacia: 'FACTURADO',
    quitar: { adjunto: 'FACTURA' },
  },
];

describe('transiciones de la máquina de estados (T004)', () => {
  it.each(CASOS)('$nombre: se aplica con los requisitos cumplidos', (caso) => {
    const resultado = aplicarTransicion(
      caso.servicio,
      caso.accion,
      [caso.rol],
      adj(caso.servicio, ...caso.adjuntos),
      CONFIG_DEFECTO,
      AHORA
    );

    expect(resultado.estado).toBe(caso.hacia);
    expect(resultado.syncState).toBe('pending');
    expect(resultado.actualizadoEn).toBe(AHORA);
    expect(resultado.camposSucios).toContain('estado');
  });

  it.each(CASOS)('$nombre: el Administrador también puede', (caso) => {
    const resultado = aplicarTransicion(
      caso.servicio,
      caso.accion,
      ['Administrador'],
      adj(caso.servicio, ...caso.adjuntos),
      CONFIG_DEFECTO,
      AHORA
    );

    expect(resultado.estado).toBe(caso.hacia);
  });

  it.each(CASOS)('$nombre: rechaza a un rol sin permiso', (caso) => {
    const otro: Rol = caso.rol === 'Tecnico' ? 'Comercial' : 'Tecnico';

    expect(() =>
      aplicarTransicion(
        caso.servicio,
        caso.accion,
        [otro],
        adj(caso.servicio, ...caso.adjuntos),
        CONFIG_DEFECTO,
        AHORA
      )
    ).toThrow(SinPermisoError);
  });

  it.each(CASOS)('$nombre: rechaza cuando falta un requisito y lo indica', (caso) => {
    const servicio = caso.quitar.campo
      ? con(caso.servicio, { [caso.quitar.campo]: undefined } as Partial<CamposServicio>)
      : caso.servicio;
    const tipos = caso.adjuntos.filter((tipo) => tipo !== caso.quitar.adjunto);

    let error: unknown;
    try {
      aplicarTransicion(
        servicio,
        caso.accion,
        [caso.rol],
        adj(servicio, ...tipos),
        CONFIG_DEFECTO,
        AHORA
      );
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(TransicionInvalidaError);
    const { errores } = error as TransicionInvalidaError;
    expect(errores.length).toBeGreaterThan(0);
    const referencia = caso.quitar.campo ?? caso.quitar.adjunto;
    expect(errores.some((e) => e.campo === referencia || e.adjunto === referencia)).toBe(true);
  });

  it('desde un estado la acción de otra etapa no existe', () => {
    expect(() =>
      aplicarTransicion(
        recibido(),
        'registrarFacturacion',
        ['Administrador'],
        [],
        CONFIG_DEFECTO,
        AHORA
      )
    ).toThrow(TransicionInvalidaError);
  });

  it.each(['FACTURADO', 'DISPOSICION_FINAL', 'ANULADO'] as const)(
    '%s es un estado final: ninguna acción lo reabre',
    (estado) => {
      const servicio: Servicio = { ...servicioBuilder().facturado().construir(), estado };

      for (const accion of ['completarDiagnostico', 'registrarFacturacion', 'anular'] as const) {
        expect(() =>
          aplicarTransicion(servicio, accion, ['Administrador'], [], CONFIG_DEFECTO, AHORA)
        ).toThrow(EstadoFinalError);
      }
    }
  );

  it('un servicio de estado desconocido no admite transiciones', () => {
    const servicio: Servicio = { ...recibido(), estado: 'DESCONOCIDO' };

    expect(() =>
      aplicarTransicion(
        servicio,
        'completarDiagnostico',
        ['Administrador'],
        [],
        CONFIG_DEFECTO,
        AHORA
      )
    ).toThrow(TransicionInvalidaError);
  });
});

describe('diagnóstico vs disposición final', () => {
  const datos = { observacionTecnica: 'Celdas con desbalance', fechaSocializacionDF: '2026-10-05' };

  it('el valor de disposición final no puede completarse como diagnóstico normal', () => {
    const servicio = con(recibido(), {
      ...datos,
      diagnostico: CONFIG_DEFECTO.diagnosticoValorDisposicionFinal,
    });

    expect(() =>
      aplicarTransicion(
        servicio,
        'completarDiagnostico',
        ['Tecnico'],
        adj(servicio, 'FORMATO_DIAGNOSTICO'),
        CONFIG_DEFECTO,
        AHORA
      )
    ).toThrow(TransicionInvalidaError);
  });

  it('un diagnóstico normal no puede cerrarse como disposición final', () => {
    const servicio = con(recibido(), { ...datos, diagnostico: 'Reparable' });

    expect(() =>
      aplicarTransicion(
        servicio,
        'registrarDisposicionFinal',
        ['Tecnico'],
        adj(servicio, 'FORMATO_DIAGNOSTICO', 'DISPOSICION_FINAL'),
        CONFIG_DEFECTO,
        AHORA
      )
    ).toThrow(TransicionInvalidaError);
  });

  it('la disposición final exige los dos PDF (formato y disposición)', () => {
    const servicio = con(recibido(), {
      ...datos,
      diagnostico: CONFIG_DEFECTO.diagnosticoValorDisposicionFinal,
    });

    expect(() =>
      aplicarTransicion(
        servicio,
        'registrarDisposicionFinal',
        ['Tecnico'],
        adj(servicio, 'FORMATO_DIAGNOSTICO'),
        CONFIG_DEFECTO,
        AHORA
      )
    ).toThrow(TransicionInvalidaError);
  });
});

describe('cotización y ruta de entrega', () => {
  it('la orden de trabajo exige la cotización aprobada', () => {
    for (const estado of ['PENDIENTE', 'RECHAZADA'] as const) {
      const servicio = con(servicioBuilder().cotizado().construir(), {
        cotizacionEstado: estado,
        otDetalle: 'Cambio de celdas y prueba',
        otCostoReparacion: 100_000,
      });

      expect(() =>
        aplicarTransicion(servicio, 'generarOT', ['Tecnico'], [], CONFIG_DEFECTO, AHORA)
      ).toThrow(TransicionInvalidaError);
    }
  });

  it('la entrega sin reparación exige la cotización rechazada', () => {
    for (const estado of ['PENDIENTE', 'APROBADA'] as const) {
      const servicio = con(servicioBuilder().cotizado().construir(), {
        cotizacionEstado: estado,
        fechaEntrega: '2026-10-15',
      });

      expect(() =>
        aplicarTransicion(
          servicio,
          'registrarEntregaSinReparacion',
          ['Tecnico'],
          adj(servicio, 'FOTO_SALIDA'),
          CONFIG_DEFECTO,
          AHORA
        )
      ).toThrow(TransicionInvalidaError);
    }
  });

  it('la entrega sin reparación no exige vida útil', () => {
    const servicio = con(servicioBuilder().cotizado().construir(), {
      cotizacionEstado: 'RECHAZADA',
      fechaEntrega: '2026-10-15',
    });

    const resultado = aplicarTransicion(
      servicio,
      'registrarEntregaSinReparacion',
      ['Tecnico'],
      adj(servicio, 'FOTO_SALIDA'),
      CONFIG_DEFECTO,
      AHORA
    );

    expect(resultado.proyeccionVidaUtil).toBeUndefined();
  });

  it('registrar la cotización deja la respuesta en PENDIENTE si no había una', () => {
    const servicio = con(servicioBuilder().diagnosticado().construir(), {
      cotizacionFechaEnvio: '2026-10-10',
    });
    delete servicio.cotizacionEstado;

    const resultado = aplicarTransicion(
      servicio,
      'registrarCotizacion',
      ['Comercial'],
      [],
      CONFIG_DEFECTO,
      AHORA
    );

    expect(resultado.cotizacionEstado).toBe('PENDIENTE');
  });

  it('la cantidad de fotos de salida respeta el máximo configurado', () => {
    const servicio = con(servicioBuilder().enReparacion().construir(), {
      fechaEntrega: '2026-10-15',
      proyeccionVidaUtil: '2027-10-15',
    });
    const fotos = Array.from(
      { length: CONFIG_DEFECTO.maxFotosSalida + 1 },
      () => 'FOTO_SALIDA' as const
    );

    expect(() =>
      aplicarTransicion(
        servicio,
        'registrarEntrega',
        ['Tecnico'],
        adj(servicio, ...fotos),
        CONFIG_DEFECTO,
        AHORA
      )
    ).toThrow(TransicionInvalidaError);
  });

  it('un adjunto marcado para eliminar no cuenta como presente', () => {
    const servicio = con(servicioBuilder().entregado().construir(), { facturaFecha: '2026-10-16' });
    const eliminada = adjuntoBuilder({
      servicioId: servicio.id,
      tipo: 'FACTURA',
      eliminarRemoto: true,
    }).construir();

    expect(() =>
      aplicarTransicion(
        servicio,
        'registrarFacturacion',
        ['Comercial'],
        [eliminada],
        CONFIG_DEFECTO,
        AHORA
      )
    ).toThrow(TransicionInvalidaError);
  });
});

describe('anulación', () => {
  it.each(NO_FINALES)('el Administrador anula desde %s con un motivo válido', (estado) => {
    const servicio: Servicio = {
      ...servicioBuilder().facturado().construir(),
      estado,
      anulacionMotivo: 'Registro duplicado por error',
    };

    const resultado = aplicarTransicion(
      servicio,
      'anular',
      ['Administrador'],
      [],
      CONFIG_DEFECTO,
      AHORA
    );

    expect(resultado.estado).toBe('ANULADO');
    expect(resultado.anulacionFecha).toBe('2026-10-21');
  });

  it('exige un motivo de al menos 10 caracteres', () => {
    const servicio: Servicio = { ...recibido(), anulacionMotivo: 'corto' };

    expect(() =>
      aplicarTransicion(servicio, 'anular', ['Administrador'], [], CONFIG_DEFECTO, AHORA)
    ).toThrow(TransicionInvalidaError);
  });

  it.each([['Tecnico'], ['Comercial']] as const)('rechaza a %s', (rol) => {
    const servicio: Servicio = { ...recibido(), anulacionMotivo: 'Registro duplicado por error' };

    expect(() => aplicarTransicion(servicio, 'anular', [rol], [], CONFIG_DEFECTO, AHORA)).toThrow(
      SinPermisoError
    );
  });
});

describe('tabla de transiciones', () => {
  it('no hay transiciones que salgan de estados finales', () => {
    const finales: EstadoServicio[] = ['FACTURADO', 'DISPOSICION_FINAL', 'ANULADO'];

    expect(TRANSICIONES.filter((t) => finales.includes(t.desde))).toEqual([]);
  });

  it('hay exactamente una acción de anular por cada estado no final', () => {
    const anular = TRANSICIONES.filter((t) => t.accion === 'anular').map((t) => t.desde);

    expect(anular.sort()).toEqual([...NO_FINALES].sort());
  });

  it('transicionesDisponibles solo lista las del rol y marca lo que falta', () => {
    const servicio = recibido();

    const tecnico = transicionesDisponibles(servicio, ['Tecnico'], [], CONFIG_DEFECTO);
    const comercial = transicionesDisponibles(servicio, ['Comercial'], [], CONFIG_DEFECTO);

    expect(tecnico.map((d) => d.t.accion).sort()).toEqual([
      'completarDiagnostico',
      'registrarDisposicionFinal',
    ]);
    expect(tecnico.every((d) => d.errores.length > 0)).toBe(true); // sin diagnóstico ni PDF
    expect(comercial).toEqual([]);
  });

  it('rolesTransicionSiguiente informa quién avanza cada estado (sin contar anular)', () => {
    expect(rolesTransicionSiguiente('DIAGNOSTICADO')).toEqual(['Comercial', 'Administrador']);
    expect(rolesTransicionSiguiente('RECIBIDO')).toEqual(['Tecnico', 'Administrador']);
    expect(rolesTransicionSiguiente('FACTURADO')).toEqual([]);
  });
});
