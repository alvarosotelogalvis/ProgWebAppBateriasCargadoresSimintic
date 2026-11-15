import { describe, it, expect } from 'vitest';

import { servicioBuilder } from '../../tests/builders/servicioBuilder';
import { mergeTresVias, type RemotoServicio } from './merge';

describe('mergeTresVias — regla de estado (T-005)', () => {
  describe('el estado más avanzado gana', () => {
    it('cuando ambos cambiaron el estado, el más avanzado gana', () => {
      const local = servicioBuilder().diagnosticado().construir();
      local.camposSucios = ['estado'];
      local.base = { estado: 'RECIBIDO' };
      local.syncState = 'pending';

      // Remoto cambió a COTIZADO (más avanzado que DIAGNOSTICADO) con los datos que ese estado exige
      const remoto: RemotoServicio = {
        estado: 'COTIZADO' as const,
        cotizacionFechaEnvio: '2026-10-10',
        cotizacionEstado: 'PENDIENTE' as const,
      };

      const { servicio, conflictos } = mergeTresVias(local, remoto);

      expect(servicio.estado).toBe('COTIZADO');
      expect(conflictos).toHaveLength(0);
      expect(servicio.syncState).toBe('synced');
    });

    it('conserva el estado local si es más avanzado', () => {
      const local = servicioBuilder().entregado().construir();
      local.camposSucios = ['estado'];
      local.base = { estado: 'EN_REPARACION' };
      local.syncState = 'pending';

      // Remoto cambió a COTIZADO (menos avanzado que ENTREGADO)
      const remoto: RemotoServicio = { estado: 'COTIZADO' as const };

      const { servicio, conflictos } = mergeTresVias(local, remoto);

      expect(servicio.estado).toBe('ENTREGADO');
      expect(conflictos).toHaveLength(0);
      expect(servicio.syncState).toBe('pending');
    });

    it('marca conflicto cuando ambos cambiaron al mismo nivel', () => {
      const local = servicioBuilder().cotizado().construir();
      local.camposSucios = ['estado'];
      local.base = { estado: 'DIAGNOSTICADO' };
      local.syncState = 'pending';

      // Remoto cambió a EN_REPARACION (mismo nivel que COTIZADO en el árbol)
      const remoto: RemotoServicio = { estado: 'EN_REPARACION' as const };

      const { servicio } = mergeTresVias(local, remoto);

      expect(servicio.conflictos).toContainEqual({
        campo: 'estado',
        local: 'COTIZADO',
        remoto: 'EN_REPARACION',
      });
      expect(servicio.syncState).toBe('conflict');
    });

    it('los estados finales ganan siempre', () => {
      const local = servicioBuilder().entregado().construir();
      local.camposSucios = ['estado'];
      local.base = { estado: 'EN_REPARACION' };
      local.syncState = 'pending';

      // Remoto cambió a FACTURADO (final, gana incluso si remoto no cambió desde base)
      // Proporcionar todos los campos requeridos para coherencia
      const remoto: RemotoServicio = {
        estado: 'FACTURADO' as const,
        facturaFecha: '2026-11-07',
        facturaNumero: 'FV-001',
      };

      const { servicio } = mergeTresVias(local, remoto);

      expect(servicio.estado).toBe('FACTURADO');
      expect(servicio.syncState).toBe('synced');
    });
  });

  describe('detección de incoherencia', () => {
    it('marca conflicto de estado si el resultado es incoherente', () => {
      // El servicio necesita 'diagnostico' y 'observacionTecnica' para DIAGNOSTICADO
      const local = servicioBuilder().recibido().construir();
      local.estado = 'DIAGNOSTICADO';
      local.diagnostico = 'Defecto encontrado';
      delete local.observacionTecnica; // Falta observacionTecnica
      local.camposSucios = ['estado'];
      local.base = { estado: 'RECIBIDO' };
      local.syncState = 'pending';

      const remoto: RemotoServicio = {
        estado: 'DIAGNOSTICADO' as const,
        diagnostico: 'Defecto remoto',
      };

      const { servicio } = mergeTresVias(local, remoto);

      // Debe detectar que el estado es incoherente
      expect(servicio.conflictos.some((c) => c.campo === 'estado')).toBe(true);
    });
  });
});
