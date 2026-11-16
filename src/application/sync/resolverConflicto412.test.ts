import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '@/application/ports/loggerPort';
import type { RemoteGatewayPull } from '@/application/ports/RemoteGatewayPull';
import type { RemotoCambio } from '@/domain/sync/remoto';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearResolutorConflicto412 } from './resolverConflicto412';

const logger = {
  warn: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
} as unknown as Logger;

const resolver = (remoto: Partial<RemotoCambio>) =>
  crearResolutorConflicto412({
    remoto: {
      leerServicioRemoto: vi.fn().mockResolvedValue({
        id: '5',
        servicioId: 'x',
        fields: {},
        itemId: '5',
        eTag: '"e2"',
        ...remoto,
      }),
    } as unknown as RemoteGatewayPull,
    logger,
  });

describe('resolutor del 412 · campos vaciados en SharePoint', () => {
  it('quita el campo vaciado que no teníamos pendiente y queda resuelto', async () => {
    const sinc = servicioBuilder().diagnosticado().sincronizado().construir();
    const base = { ...sinc, otDetalle: 'Previo', base: { ...sinc.base, otDetalle: 'Previo' } };
    const local = { ...base, referencia: 'MI-REF', camposSucios: ['referencia' as const] };
    const { otDetalle: _o, ...camposRemotos } = base.base;

    const r = await resolver({ fields: camposRemotos, vaciados: ['otDetalle'] }).resolver({
      servicio: local,
    } as never);

    expect(r.estado).toBe('resuelto');
    expect('otDetalle' in r.servicio).toBe(false);
    expect(r.servicio.referencia).toBe('MI-REF');
    expect(r.servicio.sp?.eTag).toBe('"e2"');
  });

  it('es conflicto si lo habíamos editado y SharePoint lo vació', async () => {
    const base = servicioBuilder().diagnosticado().sincronizado().construir();
    const local = {
      ...base,
      observacionTecnica: 'MÍA',
      camposSucios: ['observacionTecnica' as const],
    };
    const { observacionTecnica: _o, ...camposRemotos } = base.base;

    const r = await resolver({ fields: camposRemotos, vaciados: ['observacionTecnica'] }).resolver({
      servicio: local,
    } as never);

    expect(r.estado).toBe('conflict');
    expect(r.servicio.conflictos).toEqual([
      { campo: 'observacionTecnica', local: 'MÍA', remoto: undefined },
    ]);
  });
});
