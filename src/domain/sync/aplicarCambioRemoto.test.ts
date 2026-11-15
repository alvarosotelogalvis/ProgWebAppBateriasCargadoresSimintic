import { describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import type { Servicio } from '../servicio';
import { aplicarCambioRemoto } from './aplicarCambioRemoto';
import type { RemotoCambio } from './remoto';

const ahora = new Date('2026-11-07T10:00:00Z');
const ctx = { ahora, retencionMeses: 3 };
const MS_DIA = 24 * 60 * 60 * 1000;

const remotoRecibido: RemotoCambio['fields'] = {
  tipoEquipo: 'BATERIA',
  estado: 'RECIBIDO',
  fechaRecepcion: '2026-10-01',
  clienteId: 7,
  numeroSolicitud: 12,
  marca: 'ROQUET',
  referencia: 'REF-9',
  serie: 'AB123',
};

const cambio = (resto: Partial<RemotoCambio> = {}): RemotoCambio => ({
  id: '5',
  servicioId: '11111111-1111-4000-8000-111111111111',
  fields: remotoRecibido,
  itemId: '5',
  eTag: '"e1"',
  webUrl: 'https://sp/5',
  modified: '2026-11-06T10:00:00Z',
  ...resto,
});

const conSucios = (
  base: Servicio,
  campos: Partial<Servicio>,
  sucios: Servicio['camposSucios']
): Servicio => ({ ...base, ...campos, camposSucios: sucios, syncState: 'pending' });

describe('aplicarCambioRemoto', () => {
  describe('INSERTAR (ES-006-01, FR-006-03)', () => {
    it('crea el servicio como sincronizado y de origen remoto, con sus datos de SharePoint', () => {
      const decision = aplicarCambioRemoto(
        undefined,
        cambio({
          meta: {
            codigo: 'BAT-12-AB123',
            capturadoPor: 'a@x.com',
            creadoEn: '2026-10-01T08:00:00Z',
          },
        }),
        ctx
      );

      expect(decision.tipo).toBe('INSERTAR');
      if (decision.tipo !== 'INSERTAR') return;
      expect(decision.servicio).toMatchObject({
        id: '11111111-1111-4000-8000-111111111111',
        codigo: 'BAT-12-AB123',
        estado: 'RECIBIDO',
        syncState: 'synced',
        origen: 'remoto',
        camposSucios: [],
        conflictos: [],
        capturadoPor: 'a@x.com',
        creadoEn: '2026-10-01T08:00:00Z',
        sp: { itemId: '5', eTag: '"e1"', webUrl: 'https://sp/5' },
      });
      expect(decision.servicio.base).toMatchObject({ estado: 'RECIBIDO', serie: 'AB123' });
    });

    it('genera el código si SharePoint no lo trae', () => {
      const decision = aplicarCambioRemoto(undefined, cambio(), ctx);
      expect(decision.tipo === 'INSERTAR' && decision.servicio.codigo).toBe('BAT-12-AB123');
    });

    it('ignora un ítem sin los datos mínimos para crear un servicio', () => {
      const decision = aplicarCambioRemoto(undefined, cambio({ fields: { marca: 'X' } }), ctx);
      expect(decision).toEqual({ tipo: 'IGNORAR', motivo: 'SIN_DATOS' });
    });

    it('ignora un ítem sin ServicioId (creado a mano en SharePoint)', () => {
      const decision = aplicarCambioRemoto(undefined, cambio({ servicioId: '' }), ctx);
      expect(decision).toEqual({ tipo: 'IGNORAR', motivo: 'SIN_SERVICIO_ID' });
    });
  });

  describe('retención (ES-006-02)', () => {
    const cerrado = (meses: number): RemotoCambio =>
      cambio({
        fields: { ...remotoRecibido, estado: 'FACTURADO' },
        modified: new Date(ahora.getTime() - meses * 30 * MS_DIA).toISOString(),
      });

    it('descarga un cerrado dentro de la retención', () => {
      expect(aplicarCambioRemoto(undefined, cerrado(2), ctx).tipo).toBe('INSERTAR');
    });

    it('no descarga un cerrado fuera de la retención', () => {
      expect(aplicarCambioRemoto(undefined, cerrado(4), ctx)).toEqual({
        tipo: 'IGNORAR',
        motivo: 'FUERA_DE_RETENCION',
      });
    });

    it('descarga un abierto aunque sea antiguo', () => {
      const antiguo = cambio({ modified: new Date(ahora.getTime() - 400 * MS_DIA).toISOString() });
      expect(aplicarCambioRemoto(undefined, antiguo, ctx).tipo).toBe('INSERTAR');
    });
  });

  describe('SOBRESCRIBIR (ES-006-03, FR-006-04)', () => {
    it('toma los valores remotos si no hay cambios locales y actualiza el eTag', () => {
      const local = servicioBuilder().recibido().sincronizado().construir();
      const decision = aplicarCambioRemoto(
        local,
        cambio({
          servicioId: local.id,
          eTag: '"e2"',
          fields: { ...remotoRecibido, marca: 'NUEVA' },
        }),
        ctx
      );

      expect(decision.tipo).toBe('SOBRESCRIBIR');
      if (decision.tipo !== 'SOBRESCRIBIR') return;
      expect(decision.servicio.marca).toBe('NUEVA');
      expect(decision.servicio.syncState).toBe('synced');
      expect(decision.servicio.sp?.eTag).toBe('"e2"');
      expect(decision.servicio.base.marca).toBe('NUEVA');
      // Lo que SharePoint no manda se conserva (p. ej. el nombre del cliente).
      expect(decision.servicio.clienteNombre).toBe(local.clienteNombre);
    });

    it('conserva el estado «pendiente» de un servicio sin campos sucios pero con adjuntos por subir', () => {
      const local: Servicio = {
        ...servicioBuilder().recibido().sincronizado().construir(),
        syncState: 'pending',
      };
      const decision = aplicarCambioRemoto(local, cambio({ servicioId: local.id }), ctx);
      expect(decision.tipo === 'SOBRESCRIBIR' && decision.servicio.syncState).toBe('pending');
    });
  });

  describe('COMBINAR (ES-006-06, ES-006-07, ES-006-10, FR-006-05)', () => {
    it('combina campos distintos sin conflicto', () => {
      const base = servicioBuilder().diagnosticado().sincronizado().construir();
      const local = conSucios(base, { diagnostico: 'MI DIAGNÓSTICO' }, ['diagnostico']);
      const decision = aplicarCambioRemoto(
        local,
        cambio({ servicioId: local.id, fields: { ...base.base, fechaEntrega: '2026-10-20' } }),
        ctx
      );

      expect(decision.tipo).toBe('COMBINAR');
      if (decision.tipo !== 'COMBINAR') return;
      expect(decision.servicio.diagnostico).toBe('MI DIAGNÓSTICO');
      expect(decision.servicio.fechaEntrega).toBe('2026-10-20');
      expect(decision.servicio.conflictos).toHaveLength(0);
      expect(decision.servicio.syncState).toBe('pending');
      expect(decision.servicio.camposSucios).toEqual(['diagnostico']);
    });

    it('marca conflicto si ambos cambiaron el mismo campo con valores distintos', () => {
      const base = servicioBuilder().diagnosticado().sincronizado().construir();
      const local = conSucios(base, { observacionTecnica: 'MÍA' }, ['observacionTecnica']);
      const decision = aplicarCambioRemoto(
        local,
        cambio({ servicioId: local.id, fields: { ...base.base, observacionTecnica: 'REMOTA' } }),
        ctx
      );

      expect(decision.tipo === 'COMBINAR' && decision.servicio.conflictos).toEqual([
        { campo: 'observacionTecnica', local: 'MÍA', remoto: 'REMOTA' },
      ]);
      expect(decision.tipo === 'COMBINAR' && decision.servicio.syncState).toBe('conflict');
    });

    it('no hay conflicto si ambos pusieron el mismo valor', () => {
      const base = servicioBuilder().diagnosticado().sincronizado().construir();
      const local = conSucios(base, { observacionTecnica: 'IGUAL' }, ['observacionTecnica']);
      const decision = aplicarCambioRemoto(
        local,
        cambio({ servicioId: local.id, fields: { ...base.base, observacionTecnica: 'IGUAL' } }),
        ctx
      );

      expect(decision.tipo === 'COMBINAR' && decision.servicio.conflictos).toEqual([]);
      expect(decision.tipo === 'COMBINAR' && decision.servicio.syncState).toBe('synced');
    });
  });

  describe('servicio en conflicto (ES-006-12)', () => {
    it('no lo toca hasta que el usuario lo resuelva', () => {
      const base = servicioBuilder().diagnosticado().sincronizado().construir();
      const local: Servicio = {
        ...conSucios(base, { observacionTecnica: 'MÍA' }, ['observacionTecnica']),
        syncState: 'conflict',
        conflictos: [{ campo: 'observacionTecnica', local: 'MÍA', remoto: 'REMOTA' }],
      };
      const decision = aplicarCambioRemoto(
        local,
        cambio({ servicioId: local.id, fields: { ...base.base, observacionTecnica: 'OTRA' } }),
        ctx
      );
      expect(decision).toEqual({ tipo: 'IGNORAR', motivo: 'EN_CONFLICTO' });
    });
  });

  describe('eliminación remota', () => {
    it('elimina la copia local si está sincronizada y sin cambios', () => {
      const local = servicioBuilder().recibido().sincronizado().construir();
      const decision = aplicarCambioRemoto(
        local,
        cambio({ servicioId: local.id, fields: {}, deleted: true }),
        ctx
      );
      expect(decision).toEqual({ tipo: 'ELIMINAR_LOCAL' });
    });

    it('marca conflicto si hay cambios locales pendientes (nunca los pierde)', () => {
      const base = servicioBuilder().recibido().sincronizado().construir();
      const local = conSucios(base, { marca: 'MÍA' }, ['marca']);
      const decision = aplicarCambioRemoto(
        local,
        cambio({ servicioId: local.id, fields: {}, deleted: true }),
        ctx
      );

      expect(decision.tipo).toBe('CONFLICTO_ELIMINACION');
      if (decision.tipo !== 'CONFLICTO_ELIMINACION') return;
      expect(decision.servicio.syncState).toBe('conflict');
      expect(decision.servicio.camposSucios).toEqual(['marca']);
      expect(decision.servicio.conflictos[0]).toMatchObject({ campo: 'estado', remoto: undefined });
    });

    it('tampoco elimina un servicio con envío pendiente aunque no tenga campos sucios', () => {
      const local: Servicio = {
        ...servicioBuilder().recibido().sincronizado().construir(),
        syncState: 'pending',
      };
      const decision = aplicarCambioRemoto(
        local,
        cambio({ servicioId: local.id, fields: {}, deleted: true }),
        ctx
      );
      expect(decision.tipo).toBe('CONFLICTO_ELIMINACION');
    });

    it('ignora la eliminación de un servicio que no está en el dispositivo', () => {
      const decision = aplicarCambioRemoto(undefined, cambio({ fields: {}, deleted: true }), ctx);
      expect(decision).toEqual({ tipo: 'IGNORAR', motivo: 'SIN_DATOS' });
    });
  });
});
