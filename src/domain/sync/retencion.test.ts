import { describe, it, expect } from 'vitest';

import { debeDescargarse } from './retencion';
import type { RemotoCambio } from './remoto';

describe('debeDescargarse (T-006)', () => {
  const ahora = new Date('2026-11-07T10:00:00Z');
  const retencionMeses = 3;

  describe('servicios abiertos', () => {
    it('siempre descarga servicios abiertos aunque sean antiguos', () => {
      const antiguo = new Date(ahora.getTime() - 6 * 30 * 24 * 60 * 60 * 1000); // 6 meses atrás
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: 'open-service',
        fields: { estado: 'DIAGNOSTICADO' }, // abierto
        modified: antiguo.toISOString(),
      };

      const resultado = debeDescargarse(cambio, ahora, retencionMeses);

      expect(resultado).toBe(true);
    });
  });

  describe('servicios cerrados', () => {
    it('descarga cerrados dentro de la retención', () => {
      const hace2Meses = new Date(ahora.getTime() - 2 * 30 * 24 * 60 * 60 * 1000);
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: 'closed-service',
        fields: { estado: 'FACTURADO' }, // cerrado
        modified: hace2Meses.toISOString(),
      };

      const resultado = debeDescargarse(cambio, ahora, retencionMeses);

      expect(resultado).toBe(true);
    });

    it('no descarga cerrados que superan la retención', () => {
      const hace4Meses = new Date(ahora.getTime() - 4 * 30 * 24 * 60 * 60 * 1000);
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: 'old-service',
        fields: { estado: 'FACTURADO' }, // cerrado
        modified: hace4Meses.toISOString(),
      };

      const resultado = debeDescargarse(cambio, ahora, retencionMeses);

      expect(resultado).toBe(false);
    });

    it('reconoce estados finales: FACTURADO, DISPOSICION_FINAL, ANULADO', () => {
      const hace2Meses = new Date(ahora.getTime() - 2 * 30 * 24 * 60 * 60 * 1000);

      const changoCerradoFinal: RemotoCambio = {
        id: '1',
        servicioId: 'service-1',
        fields: { estado: 'DISPOSICION_FINAL' },
        modified: hace2Meses.toISOString(),
      };

      const changeAnulado: RemotoCambio = {
        id: '2',
        servicioId: 'service-2',
        fields: { estado: 'ANULADO' },
        modified: hace2Meses.toISOString(),
      };

      expect(debeDescargarse(changoCerradoFinal, ahora, retencionMeses)).toBe(true);
      expect(debeDescargarse(changeAnulado, ahora, retencionMeses)).toBe(true);
    });
  });

  describe('sin información de fecha', () => {
    it('descarga si no hay modified', () => {
      const cambio: RemotoCambio = {
        id: 'remoto-1',
        servicioId: 'service-1',
        fields: { estado: 'BORRADOR' },
      };

      const resultado = debeDescargarse(cambio, ahora, retencionMeses);

      expect(resultado).toBe(true);
    });
  });
});
