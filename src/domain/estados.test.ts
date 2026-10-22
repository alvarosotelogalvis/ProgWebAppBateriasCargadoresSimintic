import { describe, expect, it } from 'vitest';

import { adjuntoBuilder } from '../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../tests/builders/servicioBuilder';
import type { Adjunto } from './adjunto';
import { CONFIG_DEFECTO } from './config';
import { EstadoFinalError, SinPermisoError, TransicionInvalidaError } from './errores';
import { aplicarTransicion, esFinal, transicionesDisponibles } from './estados';
import type { AccionEtapa } from './estados';
import type { Rol, Servicio } from './servicio';

const CFG = { ...CONFIG_DEFECTO };
const AHORA = '2026-10-21T10:00:00.000Z';

const adjunto = (servicioId: string, tipo: Adjunto['tipo'], id: string): Adjunto =>
  adjuntoBuilder({ id, servicioId }).deTipo(tipo).construir();

const fotoIngreso = (s: Servicio) => [adjunto(s.id, 'FOTO_INGRESO', 'adj-foto-ingreso')];
const formato = (s: Servicio) => [adjunto(s.id, 'FORMATO_DIAGNOSTICO', 'adj-formato')];
const disposicion = (s: Servicio) => [adjunto(s.id, 'DISPOSICION_FINAL', 'adj-df')];
const fotoSalida = (s: Servicio) => [adjunto(s.id, 'FOTO_SALIDA', 'adj-foto-salida')];
const factura = (s: Servicio) => [adjunto(s.id, 'FACTURA', 'adj-factura')];

interface CasoTransicion {
  nombre: string;
  accion: AccionEtapa;
  hacia: Servicio['estado'];
  roles: Rol[];
  rolIncorrecto: Rol;
  crear: () => { servicio: Servicio; adjuntos: Adjunto[] };
  faltante: () => { servicio: Servicio; adjuntos: Adjunto[] };
  claveFaltante: string;
}

const recepcion = () =>
  servicioBuilder()
    .borrador()
    .conCampos({
      tipoEquipo: 'CARGADOR',
      fechaRecepcion: '2026-10-01',
      clienteId: 1,
      clienteNombre: 'NAVAR ASOCIADOS',
      numeroSolicitud: 1,
      marca: 'ROQUET',
      referencia: 'REF-1',
      serie: 'NV4520',
    })
    .construir();

const casos: CasoTransicion[] = [
  {
    nombre: 'BORRADOR → RECIBIDO',
    accion: 'completarRecepcion',
    hacia: 'RECIBIDO',
    roles: ['Tecnico', 'Administrador'],
    rolIncorrecto: 'Comercial',
    crear: () => {
      const servicio = recepcion();
      return { servicio, adjuntos: fotoIngreso(servicio) };
    },
    faltante: () => {
      const servicio = { ...recepcion(), serie: '' };
      return { servicio, adjuntos: fotoIngreso(servicio) };
    },
    claveFaltante: 'errores.servicio.serieRequerida',
  },
  {
    nombre: 'RECIBIDO → DIAGNOSTICADO',
    accion: 'completarDiagnostico',
    hacia: 'DIAGNOSTICADO',
    roles: ['Tecnico', 'Administrador'],
    rolIncorrecto: 'Comercial',
    crear: () => {
      const servicio = servicioBuilder()
        .conCampos({
          estado: 'RECIBIDO',
          diagnostico: 'BATERIA DESGASTADA',
          observacionTecnica: 'Se revisa el equipo y se encuentra desgaste interno.',
        })
        .construir();
      return { servicio, adjuntos: formato(servicio) };
    },
    faltante: () => {
      const servicio = servicioBuilder()
        .conCampos({
          estado: 'RECIBIDO',
          diagnostico: 'BATERIA DESGASTADA',
          observacionTecnica: 'ab',
        })
        .construir();
      return { servicio, adjuntos: formato(servicio) };
    },
    claveFaltante: 'errores.servicio.observacionFormato',
  },
  {
    nombre: 'RECIBIDO → DISPOSICION_FINAL',
    accion: 'registrarDisposicionFinal',
    hacia: 'DISPOSICION_FINAL',
    roles: ['Tecnico', 'Administrador'],
    rolIncorrecto: 'Comercial',
    crear: () => {
      const servicio = servicioBuilder()
        .conCampos({
          estado: 'RECIBIDO',
          diagnostico: 'D. FINAL',
          observacionTecnica: 'Equipo sin reparación viable.',
          fechaSocializacionDF: '2026-10-12',
        })
        .construir();
      return { servicio, adjuntos: [...formato(servicio), ...disposicion(servicio)] };
    },
    faltante: () => {
      const servicio = servicioBuilder()
        .conCampos({
          estado: 'RECIBIDO',
          diagnostico: 'D. FINAL',
          observacionTecnica: 'Equipo sin reparación viable.',
          fechaSocializacionDF: '',
        })
        .construir();
      return { servicio, adjuntos: [...formato(servicio), ...disposicion(servicio)] };
    },
    claveFaltante: 'errores.servicio.fechaSocializacionRequerida',
  },
  {
    nombre: 'DIAGNOSTICADO → COTIZADO',
    accion: 'registrarCotizacion',
    hacia: 'COTIZADO',
    roles: ['Comercial', 'Administrador'],
    rolIncorrecto: 'Tecnico',
    crear: () => {
      const servicio = servicioBuilder()
        .diagnosticado()
        .conCampos({ cotizacionFechaEnvio: '2026-10-10' })
        .construir();
      return { servicio, adjuntos: [] };
    },
    faltante: () => {
      const servicio = servicioBuilder()
        .diagnosticado()
        .conCampos({ cotizacionFechaEnvio: '' })
        .construir();
      return { servicio, adjuntos: [] };
    },
    claveFaltante: 'errores.servicio.cotizacionFechaRequerida',
  },
  {
    nombre: 'COTIZADO → EN_REPARACION',
    accion: 'generarOT',
    hacia: 'EN_REPARACION',
    roles: ['Tecnico', 'Administrador'],
    rolIncorrecto: 'Comercial',
    crear: () => {
      const servicio = servicioBuilder()
        .cotizado()
        .conCampos({
          cotizacionEstado: 'APROBADA',
          otDetalle: 'Cambio de celdas y prueba de carga.',
          otCostoReparacion: 150000,
        })
        .construir();
      return { servicio, adjuntos: [] };
    },
    faltante: () => {
      const servicio = servicioBuilder()
        .cotizado()
        .conCampos({
          cotizacionEstado: 'PENDIENTE',
          otDetalle: 'Cambio de celdas y prueba de carga.',
          otCostoReparacion: 150000,
        })
        .construir();
      return { servicio, adjuntos: [] };
    },
    claveFaltante: 'errores.servicio.cotizacionNoAprobada',
  },
  {
    nombre: 'COTIZADO → ENTREGADO (sin reparación)',
    accion: 'registrarEntregaSinReparacion',
    hacia: 'ENTREGADO',
    roles: ['Tecnico', 'Administrador'],
    rolIncorrecto: 'Comercial',
    crear: () => {
      const servicio = servicioBuilder()
        .cotizado()
        .conCampos({ cotizacionEstado: 'RECHAZADA', fechaEntrega: '2026-10-15' })
        .construir();
      return { servicio, adjuntos: fotoSalida(servicio) };
    },
    faltante: () => {
      const servicio = servicioBuilder()
        .cotizado()
        .conCampos({ cotizacionEstado: 'APROBADA', fechaEntrega: '2026-10-15' })
        .construir();
      return { servicio, adjuntos: fotoSalida(servicio) };
    },
    claveFaltante: 'errores.servicio.cotizacionNoRechazada',
  },
  {
    nombre: 'EN_REPARACION → ENTREGADO',
    accion: 'registrarEntrega',
    hacia: 'ENTREGADO',
    roles: ['Tecnico', 'Administrador'],
    rolIncorrecto: 'Comercial',
    crear: () => {
      const servicio = servicioBuilder()
        .enReparacion()
        .conCampos({ fechaEntrega: '2026-10-15', proyeccionVidaUtil: '2027-10-15' })
        .construir();
      return { servicio, adjuntos: fotoSalida(servicio) };
    },
    faltante: () => {
      const servicio = servicioBuilder()
        .enReparacion()
        .conCampos({ fechaEntrega: '2026-10-15', proyeccionVidaUtil: '' })
        .construir();
      return { servicio, adjuntos: fotoSalida(servicio) };
    },
    claveFaltante: 'errores.servicio.vidaUtilRequerida',
  },
  {
    nombre: 'ENTREGADO → FACTURADO',
    accion: 'registrarFacturacion',
    hacia: 'FACTURADO',
    roles: ['Comercial', 'Administrador'],
    rolIncorrecto: 'Tecnico',
    crear: () => {
      const servicio = servicioBuilder()
        .entregado()
        .conCampos({ facturaFecha: '2026-10-16' })
        .construir();
      return { servicio, adjuntos: factura(servicio) };
    },
    faltante: () => {
      const servicio = servicioBuilder().entregado().conCampos({ facturaFecha: '' }).construir();
      return { servicio, adjuntos: factura(servicio) };
    },
    claveFaltante: 'errores.servicio.facturaFechaRequerida',
  },
  {
    nombre: 'RECIBIDO → ANULADO',
    accion: 'anular',
    hacia: 'ANULADO',
    roles: ['Administrador'],
    rolIncorrecto: 'Tecnico',
    crear: () => {
      const servicio = servicioBuilder()
        .recibido()
        .conCampos({ anulacionMotivo: 'Registro duplicado por error.' })
        .construir();
      return { servicio, adjuntos: [] };
    },
    faltante: () => {
      const servicio = servicioBuilder()
        .recibido()
        .conCampos({ anulacionMotivo: 'corto' })
        .construir();
      return { servicio, adjuntos: [] };
    },
    claveFaltante: 'errores.servicio.motivoMinimo',
  },
];

describe('tabla de transiciones', () => {
  for (const caso of casos) {
    describe(caso.nombre, () => {
      it('aplica la transición válida y marca estado y campos de la etapa', () => {
        const { servicio, adjuntos } = caso.crear();
        const resultado = aplicarTransicion(
          servicio,
          caso.accion,
          caso.roles,
          adjuntos,
          CFG,
          AHORA
        );

        expect(resultado.estado).toBe(caso.hacia);
        expect(resultado.syncState).toBe('pending');
        expect(resultado.camposSucios).toContain('estado');
        expect(resultado.actualizadoEn).toBe(AHORA);
      });

      it('rechaza la transición si falta un requisito e informa la clave', () => {
        const { servicio, adjuntos } = caso.faltante();
        let error: unknown;
        try {
          aplicarTransicion(servicio, caso.accion, caso.roles, adjuntos, CFG, AHORA);
        } catch (capturado) {
          error = capturado;
        }

        expect(error).toBeInstanceOf(TransicionInvalidaError);
        const errores = (error as TransicionInvalidaError).errores;
        expect(errores.some((item) => item.clave === caso.claveFaltante)).toBe(true);
      });

      it('rechaza la transición con un rol no autorizado', () => {
        const { servicio, adjuntos } = caso.crear();
        expect(() =>
          aplicarTransicion(servicio, caso.accion, [caso.rolIncorrecto], adjuntos, CFG, AHORA)
        ).toThrow(SinPermisoError);
      });
    });
  }

  it('exige los adjuntos del diagnóstico y de la disposición final', () => {
    const { servicio } = casos[2]!.crear();
    expect(() =>
      aplicarTransicion(
        servicio,
        'registrarDisposicionFinal',
        ['Tecnico'],
        formato(servicio),
        CFG,
        AHORA
      )
    ).toThrow(TransicionInvalidaError);
  });

  it('exige fotos de salida en la entrega', () => {
    const { servicio } = casos[6]!.crear();
    expect(() =>
      aplicarTransicion(servicio, 'registrarEntrega', ['Tecnico'], [], CFG, AHORA)
    ).toThrow(TransicionInvalidaError);
  });

  it('rechaza el diagnóstico con el valor reservado de disposición final', () => {
    const servicio = servicioBuilder()
      .conCampos({
        estado: 'RECIBIDO',
        diagnostico: 'D. FINAL',
        observacionTecnica: 'Equipo sin reparación viable.',
      })
      .construir();
    const adjuntos = formato(servicio);

    let error: unknown;
    try {
      aplicarTransicion(servicio, 'completarDiagnostico', ['Tecnico'], adjuntos, CFG, AHORA);
    } catch (capturado) {
      error = capturado;
    }

    expect(error).toBeInstanceOf(TransicionInvalidaError);
    expect((error as TransicionInvalidaError).errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campo: 'diagnostico',
          clave: 'errores.servicio.diagnosticoEsDisposicionFinal',
        }),
      ])
    );
  });

  it('rechaza demasiadas fotos de ingreso', () => {
    const servicio = recepcion();
    const adjuntos = Array.from({ length: CFG.maxFotosIngreso + 1 }, (_, indice) =>
      adjunto(servicio.id, 'FOTO_INGRESO', `foto-${indice}`)
    );

    let error: unknown;
    try {
      aplicarTransicion(servicio, 'completarRecepcion', ['Tecnico'], adjuntos, CFG, AHORA);
    } catch (capturado) {
      error = capturado;
    }

    expect(error).toBeInstanceOf(TransicionInvalidaError);
    expect((error as TransicionInvalidaError).errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ adjunto: 'FOTO_INGRESO', clave: 'errores.adjunto.max' }),
      ])
    );
  });

  it('rechaza una acción que no existe desde el estado actual', () => {
    const servicio = servicioBuilder().recibido().construir();
    expect(() =>
      aplicarTransicion(servicio, 'registrarEntrega', ['Tecnico'], [], CFG, AHORA)
    ).toThrow(TransicionInvalidaError);
  });

  it('exige el formato de diagnóstico en el diagnóstico', () => {
    const { servicio } = casos[1]!.crear();
    expect(() =>
      aplicarTransicion(servicio, 'completarDiagnostico', ['Tecnico'], [], CFG, AHORA)
    ).toThrow(TransicionInvalidaError);
  });

  it('exige una factura en la facturación', () => {
    const { servicio } = casos[7]!.crear();
    expect(() =>
      aplicarTransicion(servicio, 'registrarFacturacion', ['Comercial'], [], CFG, AHORA)
    ).toThrow(TransicionInvalidaError);
  });
});

describe('transicionesDisponibles', () => {
  it('devuelve la lista exacta de faltantes para un servicio recibido', () => {
    const servicio = servicioBuilder().recibido().construir();
    const disponibles = transicionesDisponibles(servicio, ['Tecnico'], [], CFG);

    const diagnostico = disponibles.find((item) => item.t.accion === 'completarDiagnostico');
    expect(diagnostico).toBeDefined();
    expect(diagnostico?.errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: 'diagnostico' }),
        expect.objectContaining({ adjunto: 'FORMATO_DIAGNOSTICO' }),
      ])
    );
  });

  it('no ofrece transiciones a roles ajenos a la etapa', () => {
    const servicio = servicioBuilder().recibido().construir();
    expect(transicionesDisponibles(servicio, ['Comercial'], [], CFG)).toEqual([]);
  });

  it('no ofrece transiciones desde estados finales ni desde DESCONOCIDO', () => {
    for (const estado of ['FACTURADO', 'DISPOSICION_FINAL', 'ANULADO', 'DESCONOCIDO'] as const) {
      const servicio = servicioBuilder().conCampos({ estado }).construir();
      expect(transicionesDisponibles(servicio, ['Administrador'], [], CFG)).toEqual([]);
      expect(esFinal(estado)).toBe(estado !== 'DESCONOCIDO');
    }
  });
});

describe('aplicarTransicion desde estados cerrados', () => {
  it('lanza EstadoFinalError en estados finales', () => {
    for (const estado of ['FACTURADO', 'DISPOSICION_FINAL', 'ANULADO'] as const) {
      const servicio = servicioBuilder().conCampos({ estado }).construir();
      expect(() =>
        aplicarTransicion(servicio, 'registrarFacturacion', ['Administrador'], [], CFG, AHORA)
      ).toThrow(EstadoFinalError);
    }
  });

  it('no permite operar un servicio con estado desconocido', () => {
    const servicio = servicioBuilder().desconocido().construir();
    expect(() => aplicarTransicion(servicio, 'anular', ['Administrador'], [], CFG, AHORA)).toThrow(
      TransicionInvalidaError
    );
  });

  it('exige el rol Administrador para anular', () => {
    const servicio = servicioBuilder()
      .recibido()
      .conCampos({ anulacionMotivo: 'Registro duplicado por error.' })
      .construir();
    expect(() => aplicarTransicion(servicio, 'anular', ['Tecnico'], [], CFG, AHORA)).toThrow(
      SinPermisoError
    );
  });

  it('asigna la fecha de anulación y conserva el motivo', () => {
    const servicio = servicioBuilder()
      .recibido()
      .conCampos({ anulacionMotivo: 'Registro duplicado por error.' })
      .construir();
    const anulado = aplicarTransicion(servicio, 'anular', ['Administrador'], [], CFG, AHORA);
    expect(anulado.anulacionFecha).toBe('2026-10-21');
    expect(anulado.camposSucios).toEqual(
      expect.arrayContaining(['estado', 'anulacionMotivo', 'anulacionFecha'])
    );
  });

  it('deja la cotización en PENDIENTE si no se indicó estado', () => {
    const servicio = servicioBuilder()
      .diagnosticado()
      .conCampos({ cotizacionFechaEnvio: '2026-10-10' })
      .construir();
    const cotizado = aplicarTransicion(
      servicio,
      'registrarCotizacion',
      ['Comercial'],
      [],
      CFG,
      AHORA
    );
    expect(cotizado.cotizacionEstado).toBe('PENDIENTE');
  });
});
