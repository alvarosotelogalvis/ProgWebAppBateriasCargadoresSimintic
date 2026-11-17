// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONFIG_DEFECTO, combinarConfig } from '@/domain/config';

import {
  VALOR_COTIZACION_ESTADO,
  VALOR_ESTADO,
  VALOR_TIPO_ADJUNTO,
  VALOR_TIPO_EQUIPO,
} from './mappers/choices';
import { CAMPO_SP, COLUMNAS_SOLO_POWER_AUTOMATE } from './mappers/servicioMapper';

/**
 * `scripts/provision-sharepoint.ps1` crea en SharePoint lo que esta app espera encontrar. Si el script y el
 * código se desincronizan, un sitio nuevo funcionaría a medias. Estas pruebas leen el script como texto y
 * lo comparan con los mapeadores, los Choice y el esquema de configuración de la app.
 */
const script = readFileSync(resolve(process.cwd(), 'scripts/provision-sharepoint.ps1'), 'utf-8');

const bloque = (nombre: string): string => {
  const m = new RegExp(`\\$${nombre} = @\\(([\\s\\S]*?)\\n\\)`).exec(script);
  if (!m) throw new Error(`No se encontró el bloque $${nombre} en el script`);
  return m[1]!;
};

const nombresDe = (texto: string): string[] =>
  [...texto.matchAll(/\bN = '([A-Za-z]+)'/g)].map((m) => m[1]!);

const opcionesDe = (texto: string, campo: string): string[] => {
  const linea = texto.split('\n').find((l) => l.includes(`N = '${campo}'`)) ?? '';
  const m = /Opciones = @\(([^)]*)\)/.exec(linea);
  if (!m) throw new Error(`No se encontraron las opciones de ${campo}`);
  return [...m[1]!.matchAll(/'([^']*)'/g)].map((x) => x[1]!);
};

const ordenados = (valores: readonly string[]): string[] => [...valores].sort();

describe('provision-sharepoint.ps1 coincide con la app', () => {
  const servicios = bloque('CamposServicios');

  it('está en UTF-8 con BOM (las tildes de los Choice deben leerse bien en PowerShell 5.1)', () => {
    const bytes = readFileSync(resolve(process.cwd(), 'scripts/provision-sharepoint.ps1'));
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('crea las seis listas y bibliotecas que la app busca por nombre', () => {
    const creadas = [...script.matchAll(/Confirm-Lista '([A-Za-z]+)'/g)].map((m) => m[1]!);
    expect(ordenados(creadas)).toEqual(
      ordenados([
        'Servicios',
        'Clientes',
        'Marcas',
        'ConfiguracionApp',
        'LogSincronizacion',
        'ServiciosAdjuntos',
      ])
    );
  });

  it('Servicios tiene todas las columnas del mapeador, con su nombre interno', () => {
    const columnas = nombresDe(servicios);
    // La app lee y escribe `ClienteLookupId`: SharePoint la expone al crear la búsqueda `Cliente`.
    const delMapeador = Object.values(CAMPO_SP).map((c) =>
      c === 'ClienteLookupId' ? 'Cliente' : c
    );
    for (const columna of delMapeador) {
      expect(columnas, `falta la columna ${columna}`).toContain(columna);
    }
  });

  it('Servicios incluye las columnas de captura que la app envía y las de Power Automate', () => {
    const columnas = nombresDe(servicios);
    const captura = [
      'ServicioId',
      'CapturadoPor',
      'CapturadoPorNombre',
      'CapturadoEn',
      'ActualizadoEnDispositivo',
      'DispositivoId',
      'AppVersion',
      'UrlCarpetaAdjuntos',
    ];
    for (const columna of [...captura, ...COLUMNAS_SOLO_POWER_AUTOMATE]) {
      expect(columnas, `falta la columna ${columna}`).toContain(columna);
    }
  });

  it('Servicios no tiene columnas que nadie use (ni la app ni Power Automate)', () => {
    const conocidas = new Set<string>([
      ...Object.values(CAMPO_SP).map((c) => (c === 'ClienteLookupId' ? 'Cliente' : c)),
      'ServicioId',
      'CapturadoPor',
      'CapturadoPorNombre',
      'CapturadoEn',
      'ActualizadoEnDispositivo',
      'DispositivoId',
      'AppVersion',
      'UrlCarpetaAdjuntos',
      ...COLUMNAS_SOLO_POWER_AUTOMATE,
    ]);
    const sobrantes = nombresDe(servicios).filter((c) => !conocidas.has(c));
    expect(sobrantes).toEqual([]);
  });

  it('las columnas de la bitácora y de la biblioteca son las que la app escribe', () => {
    expect(ordenados(nombresDe(bloque('CamposLog')))).toEqual(
      ordenados([
        'Usuario',
        'Dispositivo',
        'AppVersion',
        'Inicio',
        'Fin',
        'Resultado',
        'ServiciosSubidos',
        'ArchivosSubidos',
        'ServiciosDescargados',
        'Conflictos',
        'Errores',
        'Detalle',
      ])
    );
    expect(ordenados(nombresDe(bloque('CamposAdjuntos')))).toEqual(
      ordenados(['ServicioId', 'AdjuntoId', 'TipoAdjunto', 'FechaCaptura', 'CapturadoPor'])
    );
  });

  it('Clientes tiene las columnas de la spec 010 y el grupo de usuarios puede escribir en ella (ADR-0023)', () => {
    expect(ordenados(nombresDe(bloque('CamposClientes')))).toEqual(
      ordenados([
        'NIT',
        'Activo',
        'CorreoContacto',
        'ClienteGuid',
        'NombreNormalizado',
        'FusionadoConId',
        'CreadoDesdeApp',
      ])
    );
    expect(script).toMatch(/Clientes\s*=\s*'Contribute'/);
    expect(script).toMatch(/Marcas\s*=\s*'Read'/);
  });

  it('los valores de los Choice son exactamente los que la app traduce', () => {
    const estados = /\$EstadosServicio = @\(([^)]*)\)/.exec(script)![1]!;
    expect(ordenados([...estados.matchAll(/'([^']*)'/g)].map((m) => m[1]!))).toEqual(
      ordenados(Object.values(VALOR_ESTADO))
    );
    expect(ordenados(opcionesDe(servicios, 'TipoEquipo'))).toEqual(
      ordenados(Object.values(VALOR_TIPO_EQUIPO))
    );
    expect(ordenados(opcionesDe(servicios, 'CotizacionEstado'))).toEqual(
      ordenados(Object.values(VALOR_COTIZACION_ESTADO))
    );
    expect(ordenados(opcionesDe(bloque('CamposAdjuntos'), 'TipoAdjunto'))).toEqual(
      ordenados(Object.values(VALOR_TIPO_ADJUNTO))
    );
  });

  it('el diagnóstico incluye el valor que la app trata como disposición final', () => {
    expect(opcionesDe(servicios, 'Diagnostico')).toContain(
      CONFIG_DEFECTO.diagnosticoValorDisposicionFinal
    );
  });

  describe('claves de ConfiguracionApp', () => {
    const m = /\$ConfiguracionPorDefecto = \[ordered\]@\{([\s\S]*?)\n\}/.exec(script);
    const claves = Object.fromEntries(
      [...(m?.[1] ?? '').matchAll(/^\s+([A-Za-z]+)\s+=\s+@\('([^']*)'/gm)].map((x) => [
        x[1]!,
        x[2]!,
      ])
    );

    it('el script define claves', () => {
      expect(Object.keys(claves).length).toBeGreaterThan(10);
    });

    it('los valores por defecto son válidos para la app y producen su configuración por defecto', () => {
      const avisos: string[] = [];
      const config = combinarConfig(claves, CONFIG_DEFECTO, {
        warn: (evento) => avisos.push(evento),
      });

      expect(avisos, 'la app rechazó algún valor del script').toEqual([]);
      expect(config).toEqual(CONFIG_DEFECTO);
    });

    it('cubre todas las claves de la app salvo los correos (que dependen del cliente)', () => {
      const esperadas = [
        'VersionMinimaApp',
        'SyncModoAutenticacion',
        'SyncReautenticacionHoras',
        'MinFotosIngreso',
        'MaxFotosIngreso',
        'MinFotosSalida',
        'MaxFotosSalida',
        'MaxTamanoPdfMB',
        'ImagenMaxLadoPx',
        'ImagenCalidad',
        'VidaUtilMesesDefecto',
        'UmbralesAlertaDias',
        'RetencionCerradosMeses',
        'RetencionOriginalesDias',
        'DescargarMiniaturasRemotas',
        'DiagnosticoValorDisposicionFinal',
        'RecordatorioPendientesHoras',
      ];
      expect(ordenados(Object.keys(claves))).toEqual(ordenados(esperadas));
    });
  });
});
