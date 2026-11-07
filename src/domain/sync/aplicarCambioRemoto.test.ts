import { describe, it, expect } from 'vitest';

import { servicioBuilder } from '../../tests/builders/servicioBuilder';
import { aplicarCambioRemoto } from './aplicarCambioRemoto';
import type { RemotoCambio } from './remoto';
import type { Servicio } from '../servicio';

describe('aplicarCambioRemoto (T-16)', () => {
  const ahora = new Date('2026-11-07T10:00:00Z');
  const retencionMeses = 3;
  const ctx = { ahora, retencionMeses };

  describe('INSERTAR', () => {
    it('inserta un servicio remoto nuevo que no existe localmente', () => {
      const nuevoId = '11111111-1111-4000-8000-111111111111';
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: nuevoId,
        fields: {
          titulo: 'Mi primer servicio',
          estado: 'BORRADOR',
        },
        itemId: 'item-1',
      };

      const decision = aplicarCambioRemoto(undefined, cambio, ctx);

      expect(decision.tipo).toBe('INSERTAR');
      expect(decision.servicio.id).toBe(nuevoId);
      expect(decision.servicio.titulo).toBe('Mi primer servicio');
      expect(decision.servicio.syncState).toBe('synced');
      expect(decision.servicio.origen).toBe('remoto');
    });
  });

  describe('SOBRESCRIBIR', () => {
    it('sobrescribe localmente si no hay cambios pendientes', () => {
      const local = servicioBuilder()
        .recibido()
        .sincronizado()
        .conCampos({ titulo: 'Título antiguo' })
        .construir();
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: local.id,
        fields: {
          titulo: 'Título nuevo',
          estado: 'DIAGNOSTICADO',
        },
        itemId: 'item-1',
      };

      const decision = aplicarCambioRemoto(local, cambio, ctx);

      expect(decision.tipo).toBe('SOBRESCRIBIR');
      expect(decision.servicio.titulo).toBe('Título nuevo');
      expect(decision.servicio.estado).toBe('DIAGNOSTICADO');
      expect(decision.servicio.syncState).toBe('synced');
      expect(decision.servicio.base).toMatchObject({
        titulo: 'Título nuevo',
        estado: 'DIAGNOSTICADO',
      });
    });
  });

  describe('COMBINAR (merge a 3 vías)', () => {
    it('combina cambios en campos distintos sin conflicto', () => {
      const base = servicioBuilder().recibido().sincronizado().construir();
      const local: Servicio = {
        ...base,
        titulo: 'Título antiguo',
        diagnostico: 'Nuevo diagnóstico',
        camposSucios: ['diagnostico'],
        syncState: 'pending',
      };
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: local.id,
        fields: {
          titulo: 'Título remoto',
          observacionTecnica: 'Nueva observación remota',
        },
        itemId: 'item-1',
      };

      const decision = aplicarCambioRemoto(local, cambio, ctx);

      expect(decision.tipo).toBe('COMBINAR');
      expect(decision.servicio.titulo).toBe('Título remoto');
      expect(decision.servicio.diagnostico).toBe('Nuevo diagnóstico');
      expect(decision.servicio.observacionTecnica).toBe('Nueva observación remota');
      expect(decision.servicio.conflictos).toHaveLength(0);
      expect(decision.servicio.syncState).toBe('pending');
    });

    it('detecta conflicto cuando ambos cambiaron el mismo campo', () => {
      const base = servicioBuilder().diagnosticado().sincronizado().construir();
      const local: Servicio = {
        ...base,
        observacionTecnica: 'Mi observación',
        camposSucios: ['observacionTecnica'],
        base: { ...base.base, observacionTecnica: 'Observación antigua' },
        syncState: 'pending',
      };
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: local.id,
        fields: {
          observacionTecnica: 'Otra observación remota',
        },
        itemId: 'item-1',
      };

      const decision = aplicarCambioRemoto(local, cambio, ctx);

      expect(decision.tipo).toBe('COMBINAR');
      expect(decision.servicio.conflictos).toHaveLength(1);
      expect(decision.servicio.conflictos[0]).toMatchObject({
        campo: 'observacionTecnica',
        local: 'Mi observación',
        remoto: 'Otra observación remota',
      });
      expect(decision.servicio.syncState).toBe('conflict');
    });
  });

  describe('ELIMINAR_LOCAL', () => {
    it('elimina localmente si el remoto fue borrado y no había cambios pendientes', () => {
      const local = servicioBuilder().recibido().sincronizado().construir();
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: local.id,
        fields: {},
        itemId: 'item-1',
        deleted: true,
      };

      const decision = aplicarCambioRemoto(local, cambio, ctx);

      expect(decision.tipo).toBe('ELIMINAR_LOCAL');
    });
  });

  describe('CONFLICTO_ELIMINACION', () => {
    it('marca conflicto si el remoto fue borrado pero hay cambios pendientes locales', () => {
      const base = servicioBuilder().recibido().sincronizado().construir();
      const local: Servicio = {
        ...base,
        titulo: 'Mi cambio',
        camposSucios: ['titulo'],
        syncState: 'pending',
      };
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: local.id,
        fields: {},
        itemId: 'item-1',
        deleted: true,
      };

      const decision = aplicarCambioRemoto(local, cambio, ctx);

      expect(decision.tipo).toBe('CONFLICTO_ELIMINACION');
      expect(decision.servicio.conflictos).toHaveLength(1);
      expect(decision.servicio.conflictos[0].campo).toBe('estado');
      expect(decision.servicio.syncState).toBe('conflict');
    });
  });

  describe('IGNORAR', () => {
    it('ignora si el servicio remoto carece de ServicioId (creado a mano en SP)', () => {
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: '', // vacío
        fields: { titulo: 'Servicio sin ID' },
        itemId: 'item-1',
      };

      const decision = aplicarCambioRemoto(undefined, cambio, ctx);

      expect(decision.tipo).toBe('IGNORAR');
      expect(decision.motivo).toBe('SIN_SERVICIO_ID');
    });

    it('ignora si el servicio es cerrado y supera la retención', () => {
      const cierre = new Date(ahora.getTime() - 4 * 30 * 24 * 60 * 60 * 1000); // 4 meses atrás
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: 'old-service',
        fields: {
          ServicioId: 'old-service',
          estado: 'FACTURADO',
          fechaEntrega: cierre.toISOString(),
        },
        itemId: 'item-1',
        modified: cierre.toISOString(),
      };

      const decision = aplicarCambioRemoto(undefined, cambio, ctx);

      expect(decision.tipo).toBe('IGNORAR');
      expect(decision.motivo).toBe('FUERA_DE_RETENCION');
    });

    it('incluye un servicio abierto aunque sea antiguo', () => {
      const antiguo = new Date(ahora.getTime() - 4 * 30 * 24 * 60 * 60 * 1000); // 4 meses atrás
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: 'open-service',
        fields: {
          ServicioId: 'open-service',
          estado: 'DIAGNOSTICADO', // abierto
        },
        itemId: 'item-1',
        modified: antiguo.toISOString(),
      };

      const decision = aplicarCambioRemoto(undefined, cambio, ctx);

      expect(decision.tipo).toBe('INSERTAR');
    });
  });
});
