import { describe, expect, it } from 'vitest';

import { FakeLogger } from '../../tests/fakes/FakeLogger';
import { CONFIG_DEFECTO, combinarConfig } from './config';

describe('combinarConfig', () => {
  it('devuelve los valores por defecto cuando no hay configuración remota', () => {
    expect(combinarConfig(undefined)).toEqual(CONFIG_DEFECTO);
    expect(combinarConfig(null)).toEqual(CONFIG_DEFECTO);
  });

  it('sobrescribe solo las claves válidas y convierte los valores de SharePoint', () => {
    const resultado = combinarConfig({
      DiagnosticoValorDisposicionFinal: 'CHATARRA',
      MinFotosIngreso: '2',
      MaxFotosIngreso: '8',
      ImagenCalidad: '0.8',
      UmbralesAlertaDias: '120, 60, 15',
      DescargarMiniaturasRemotas: 'false',
      SyncModoAutenticacion: 'reautenticar',
    });

    expect(resultado.diagnosticoValorDisposicionFinal).toBe('CHATARRA');
    expect(resultado.minFotosIngreso).toBe(2);
    expect(resultado.maxFotosIngreso).toBe(8);
    expect(resultado.imagenCalidad).toBe(0.8);
    expect(resultado.umbralesAlertaDias).toEqual([120, 60, 15]);
    expect(resultado.descargarMiniaturasRemotas).toBe(false);
    expect(resultado.syncModoAutenticacion).toBe('reautenticar');
    expect(resultado.vidaUtilMesesDefecto).toBe(CONFIG_DEFECTO.vidaUtilMesesDefecto);
  });

  it('usa el valor por defecto de la clave inválida y registra una advertencia', () => {
    const logger = new FakeLogger();
    const resultado = combinarConfig(
      { ImagenCalidad: '2', VidaUtilMesesDefecto: '18' },
      CONFIG_DEFECTO,
      logger
    );

    expect(resultado.imagenCalidad).toBe(CONFIG_DEFECTO.imagenCalidad);
    expect(resultado.vidaUtilMesesDefecto).toBe(18);
    expect(logger.advertencias).toHaveLength(1);
    expect(logger.advertencias[0]?.datos?.clave).toBe('ImagenCalidad');
  });

  it('descarta un objeto que no es registro', () => {
    const logger = new FakeLogger();
    expect(combinarConfig('texto', CONFIG_DEFECTO, logger)).toEqual(CONFIG_DEFECTO);
    expect(logger.advertencias).toHaveLength(1);
  });

  it('corrige rangos de fotos incoherentes', () => {
    const logger = new FakeLogger();
    const resultado = combinarConfig(
      { MinFotosIngreso: '9', MaxFotosIngreso: '2' },
      CONFIG_DEFECTO,
      logger
    );
    expect(resultado.minFotosIngreso).toBe(CONFIG_DEFECTO.minFotosIngreso);
    expect(resultado.maxFotosIngreso).toBe(CONFIG_DEFECTO.maxFotosIngreso);
    expect(logger.advertencias).toHaveLength(1);
  });
});
