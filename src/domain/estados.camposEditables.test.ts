import { describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../tests/builders/servicioBuilder';
import { camposEditables, TODOS_LOS_CAMPOS } from './estados';
import type { CamposServicio, Rol, Servicio } from './servicio';

const RECEPCION: (keyof CamposServicio)[] = [
  'tipoEquipo',
  'fechaRecepcion',
  'clienteId',
  'clienteNombre',
  'numeroSolicitud',
  'marca',
  'referencia',
  'serie',
];
const DIAGNOSTICO: (keyof CamposServicio)[] = [
  'diagnostico',
  'observacionTecnica',
  'fechaSocializacionDF',
];
const COTIZACION: (keyof CamposServicio)[] = [
  'cotizacionFechaEnvio',
  'cotizacionValor',
  'cotizacionEstado',
];
const OT: (keyof CamposServicio)[] = ['otDetalle', 'otCostoReparacion'];
const ENTREGA: (keyof CamposServicio)[] = ['fechaEntrega', 'proyeccionVidaUtil'];
const FACTURA: (keyof CamposServicio)[] = ['facturaFecha', 'facturaNumero'];

const editables = (servicio: Servicio, roles: readonly Rol[]) =>
  [...camposEditables(servicio, roles)].sort();
const campos = (...grupos: (keyof CamposServicio)[][]) => grupos.flat().sort();

const enEstado = (estado: Servicio['estado']): Servicio => ({
  ...servicioBuilder().facturado().construir(),
  estado,
});

describe('camposEditables · estado × rol (ES-007-26 a 30)', () => {
  it('BORRADOR: el Técnico y el Administrador editan la recepción; el Comercial nada', () => {
    const s = enEstado('BORRADOR');

    expect(editables(s, ['Tecnico'])).toEqual(campos(RECEPCION));
    expect(editables(s, ['Administrador'])).toEqual(campos(RECEPCION));
    expect(editables(s, ['Comercial'])).toEqual([]);
  });

  it('RECIBIDO: el Técnico edita el diagnóstico; el Admin además la recepción', () => {
    const s = enEstado('RECIBIDO');

    expect(editables(s, ['Tecnico'])).toEqual(campos(DIAGNOSTICO));
    expect(editables(s, ['Comercial'])).toEqual([]);
    expect(editables(s, ['Administrador'])).toEqual(campos(RECEPCION, DIAGNOSTICO));
  });

  it('DIAGNOSTICADO: el Comercial edita la cotización; el Técnico solo lee', () => {
    const s = enEstado('DIAGNOSTICADO');

    expect(editables(s, ['Comercial'])).toEqual(campos(COTIZACION));
    expect(editables(s, ['Tecnico'])).toEqual([]);
    expect(editables(s, ['Administrador'])).toEqual(campos(RECEPCION, DIAGNOSTICO, COTIZACION));
  });

  it('COTIZADO: el Técnico edita OT y entrega; el Comercial no edita campos (usa la respuesta)', () => {
    const s = enEstado('COTIZADO');

    expect(editables(s, ['Tecnico'])).toEqual(campos(OT, ENTREGA));
    expect(editables(s, ['Comercial'])).toEqual([]);
  });

  it('EN_REPARACION: el Técnico edita la entrega', () => {
    const s = enEstado('EN_REPARACION');

    expect(editables(s, ['Tecnico'])).toEqual(campos(ENTREGA));
    expect(editables(s, ['Comercial'])).toEqual([]);
  });

  it('ENTREGADO: el Comercial edita la facturación', () => {
    const s = enEstado('ENTREGADO');

    expect(editables(s, ['Comercial'])).toEqual(campos(FACTURA));
    expect(editables(s, ['Tecnico'])).toEqual([]);
  });

  it.each(['FACTURADO', 'DISPOSICION_FINAL', 'ANULADO'] as const)(
    '%s (final): Técnico y Comercial en solo lectura; el Admin corrige datos',
    (estado) => {
      const s = enEstado(estado);

      expect(editables(s, ['Tecnico'])).toEqual([]);
      expect(editables(s, ['Comercial'])).toEqual([]);
      expect(editables(s, ['Administrador']).length).toBeGreaterThan(0);
    }
  );

  it('en estados finales el Admin no toca la fecha de anulación salvo en ANULADO', () => {
    expect(camposEditables(enEstado('FACTURADO'), ['Administrador']).has('anulacionFecha')).toBe(
      false
    );
    expect(camposEditables(enEstado('ANULADO'), ['Administrador']).has('anulacionFecha')).toBe(
      true
    );
    expect(camposEditables(enEstado('ANULADO'), ['Administrador']).has('anulacionMotivo')).toBe(
      true
    );
  });

  it('nunca son editables el estado ni los campos de identidad, ni siquiera para el Admin', () => {
    for (const estado of ['BORRADOR', 'RECIBIDO', 'COTIZADO', 'FACTURADO', 'ANULADO'] as const) {
      const admin = camposEditables(enEstado(estado), ['Administrador']);

      expect(admin.has('estado')).toBe(false);
      for (const prohibido of ['id', 'codigo', 'capturadoPor', 'creadoEn']) {
        expect(admin.has(prohibido as keyof CamposServicio)).toBe(false);
      }
      for (const campo of admin) expect(TODOS_LOS_CAMPOS).toContain(campo);
    }
  });

  it('sin roles o con estado desconocido no se edita nada', () => {
    expect(editables(enEstado('RECIBIDO'), [])).toEqual([]);
    expect(editables(enEstado('DESCONOCIDO'), ['Administrador'])).toEqual([]);
  });

  it('un usuario con varios roles edita la unión de lo que le corresponde', () => {
    const s = enEstado('RECIBIDO');

    expect(editables(s, ['Tecnico', 'Comercial'])).toEqual(campos(DIAGNOSTICO));
    expect(editables(enEstado('DIAGNOSTICADO'), ['Tecnico', 'Comercial'])).toEqual(
      campos(COTIZACION)
    );
  });
});
