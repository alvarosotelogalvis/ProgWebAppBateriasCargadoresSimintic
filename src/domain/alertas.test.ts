import { describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../tests/builders/servicioBuilder';
import { diasRestantes, filtrarAlertasActivas, nivelAlerta } from './alertas';

describe('diasRestantes', () => {
  it('calcula días completos entre hoy y la fecha objetivo', () => {
    expect(diasRestantes('2026-12-31', '2026-10-21')).toBe(71);
    expect(diasRestantes('2026-10-21', '2026-10-21')).toBe(0);
    expect(diasRestantes('2026-10-20', '2026-10-21')).toBe(-1);
  });

  it('devuelve NaN para fechas inválidas', () => {
    expect(Number.isNaN(diasRestantes('no-es-fecha', '2026-10-21'))).toBe(true);
  });
});

describe('nivelAlerta', () => {
  it('aplica los umbrales por defecto', () => {
    expect(nivelAlerta(120)).toBeNull();
    expect(nivelAlerta(91)).toBeNull();
    expect(nivelAlerta(90)).toBe('90');
    expect(nivelAlerta(89)).toBe('90');
    expect(nivelAlerta(60)).toBe('60');
    expect(nivelAlerta(30)).toBe('30');
    expect(nivelAlerta(0)).toBe('30');
  });

  it('marca como vencida una fecha pasada', () => {
    expect(nivelAlerta(-1)).toBe('vencida');
  });

  it('admite umbrales personalizados desordenados', () => {
    expect(nivelAlerta(59, [30, 90, 60])).toBe('60');
    expect(nivelAlerta(100, [30, 90, 60])).toBeNull();
  });

  it('devuelve null para valores no finitos', () => {
    expect(nivelAlerta(Number.NaN)).toBeNull();
    expect(nivelAlerta(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('filtrarAlertasActivas', () => {
  const HOY = '2026-10-21';
  const entregado = (
    id: string,
    vidaUtil: string | undefined,
    estado: 'entregado' | 'facturado' = 'entregado'
  ) => {
    const servicio = servicioBuilder()[estado]().conId(id).construir();
    if (vidaUtil === undefined) delete servicio.proyeccionVidaUtil;
    else servicio.proyeccionVidaUtil = vidaUtil;
    return servicio;
  };
  const niveles = (servicios: ReturnType<typeof entregado>[]) =>
    Object.fromEntries(
      filtrarAlertasActivas(servicios, undefined, HOY).map((a) => [a.servicioId, a.nivel])
    );

  it('clasifica por días restantes con los umbrales por defecto', () => {
    expect(
      niveles([
        entregado('v', '2026-10-20'), // -1 día
        entregado('d30', '2026-11-20'), // 30 días
        entregado('d31', '2026-11-21'), // 31 días
        entregado('d60', '2026-12-20'), // 60 días
        entregado('d90', '2027-01-19'), // 90 días
        entregado('d91', '2027-01-20'), // 91 días: sin alerta
      ])
    ).toEqual({ v: 'vencida', d30: '30', d31: '60', d60: '60', d90: '90' });
  });

  it('hoy mismo ya cuenta como dentro de los 30 días (no vencida)', () => {
    expect(niveles([entregado('hoy', HOY)])).toEqual({ hoy: '30' });
  });

  it('incluye entregados y facturados, y excluye otros estados o sin vida útil', () => {
    const recibido = servicioBuilder().recibido().conId('r').construir();
    recibido.proyeccionVidaUtil = '2026-11-01';

    expect(
      niveles([
        entregado('e', '2026-11-01'),
        entregado('f', '2026-11-01', 'facturado'),
        entregado('sin', undefined),
        recibido,
      ])
    ).toEqual({ e: '30', f: '30' });
  });

  it('informa los días restantes y la fecha como texto yyyy-MM-dd (sin desfase de zona horaria)', () => {
    const [alerta] = filtrarAlertasActivas([entregado('a', '2026-10-25')], undefined, HOY);

    expect(alerta).toMatchObject({
      servicioId: 'a',
      nivel: '30',
      diasRestantes: 4,
      proyeccionVidaUtil: '2026-10-25',
    });
  });

  it('respeta umbrales personalizados y los niveles conservan su nombre', () => {
    const alertas = filtrarAlertasActivas(
      [entregado('a', '2026-12-31')], // 71 días
      { diasAlerta90: 120, diasAlerta60: 100, diasAlerta30: 72 },
      HOY
    );

    expect(alertas.map((a) => a.nivel)).toEqual(['30']);
  });
});
