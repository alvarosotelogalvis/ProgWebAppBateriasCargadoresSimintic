import { describe, expect, it, vi } from 'vitest';

import { CONFIG_DEFECTO } from '@/domain/config';

import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearDespuesDelPush, type DepsDespuesDelPush } from './despuesDelPush';

const contexto = () => ({
  correlationId: 'corr-1',
  resumen: { subidos: 0, archivos: 0, errores: 0, conflictos: 0, resultado: 'OK' as const },
  signal: new AbortController().signal,
});

const armar = (cambios: Partial<DepsDespuesDelPush> = {}) => {
  const orden: string[] = [];
  const logger = new FakeLogger();
  const deps: DepsDespuesDelPush = {
    gateway: {
      leerCatalogos: vi.fn(async () => {
        orden.push('catalogos');
        return {
          clientes: [],
          marcas: [],
          choices: {
            Diagnostico: [],
            Estado: [],
            CotizacionEstado: [],
            TipoEquipo: [],
            TipoAdjunto: [],
          },
        };
      }),
      cambiosServicios: vi.fn(),
      leerServicioRemoto: vi.fn(),
      listarArchivosServicio: vi.fn(),
      descargarMiniatura: vi.fn(),
    },
    catalogos: { obtener: vi.fn(), guardar: vi.fn(async () => undefined) },
    pullServicios: vi.fn(async () => {
      orden.push('pull');
      return {
        descargados: 2,
        actualizados: 0,
        conflictos: 0,
        eliminados: 0,
        servicioIds: ['a', 'b'],
      };
    }),
    listarAdjuntosRemotos: vi.fn(async (id: string) => {
      orden.push(`listar:${id}`);
      return 0;
    }),
    descargarMiniaturas: vi.fn(async () => {
      orden.push('miniaturas');
      return 0;
    }),
    config: () => CONFIG_DEFECTO,
    logger,
    ...cambios,
  };
  return { deps, orden, logger };
};

describe('despuesDelPush', () => {
  it('refresca catálogos, descarga servicios y luego sus adjuntos y miniaturas', async () => {
    const { deps, orden } = armar();

    await crearDespuesDelPush(deps)(contexto());

    expect(orden).toEqual(['catalogos', 'pull', 'listar:a', 'listar:b', 'miniaturas']);
    expect(deps.descargarMiniaturas).toHaveBeenCalledWith(['a', 'b'], expect.any(AbortSignal));
  });

  it('no registra adjuntos ni miniaturas si la configuración las desactiva', async () => {
    const { deps, orden } = armar({
      config: () => ({ ...CONFIG_DEFECTO, descargarMiniaturasRemotas: false }),
    });

    await crearDespuesDelPush(deps)(contexto());

    expect(orden).toEqual(['catalogos', 'pull']);
  });

  it('si falla el refresco de catálogos, la descarga continúa (ES-006-05)', async () => {
    const { deps, orden, logger } = armar();
    vi.mocked(deps.gateway.leerCatalogos).mockRejectedValue(new Error('sin red'));

    await crearDespuesDelPush(deps)(contexto());

    expect(orden).toContain('pull');
    expect(logger.advertencias.map((evento) => evento.evento)).toContain(
      'catalogos.refresco.fallo'
    );
  });

  it('si falla la descarga lo registra y no lanza: lo ya subido sigue valiendo', async () => {
    const { deps, logger } = armar();
    vi.mocked(deps.pullServicios).mockRejectedValue(new Error('SharePoint caído'));

    await expect(crearDespuesDelPush(deps)(contexto())).resolves.toBeUndefined();

    expect(logger.errores.map((evento) => evento.evento)).toEqual(['pull.error']);
    expect(deps.descargarMiniaturas).not.toHaveBeenCalled();
  });
});
