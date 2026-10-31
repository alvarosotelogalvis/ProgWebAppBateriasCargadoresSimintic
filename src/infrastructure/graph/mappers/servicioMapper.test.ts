import { describe, expect, it } from 'vitest';

import { CAMPOS_SERVICIO } from '@/domain/servicio';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import {
  VALOR_COTIZACION_ESTADO,
  VALOR_ESTADO,
  VALOR_TIPO_ADJUNTO,
  VALOR_TIPO_EQUIPO,
  codigoAValor,
  estadoDesdeSharePoint,
  tipoAdjuntoDesdeSharePoint,
  valorACodigo,
} from './choices';
import { aCamposSP, deCamposSP } from './servicioMapper';

const servicioCompleto = () => {
  const servicio = servicioBuilder()
    .facturado()
    .conCampos({
      clienteId: 7,
      clienteNombre: 'NAVAR ASOCIADOS',
      observacionTecnica: 'Se revisa el equipo y se encuentra desgaste interno.',
      anulacionMotivo: 'Registro duplicado por error del técnico.',
      anulacionFecha: '2026-10-20',
      cotizacionValor: 150_000,
    })
    .construir();
  return {
    ...servicio,
    urlCarpetaAdjuntos: 'https://empresa.sharepoint.com/sites/x/2026/servicio',
  };
};

describe('aCamposSP', () => {
  it('mapea identidad, sistema y columnas de SharePoint', () => {
    const servicio = servicioCompleto();
    const remoto = aCamposSP(servicio);

    expect(remoto.ServicioId).toBe(servicio.id);
    expect(remoto.Title).toBe(servicio.codigo);
    expect(remoto.CapturadoPor).toBe(servicio.capturadoPor);
    expect(remoto.CapturadoPorNombre).toBe(servicio.capturadoPorNombre);
    expect(remoto.CapturadoEn).toBe(servicio.creadoEn);
    expect(remoto.AppVersion).toBe(servicio.appVersion);
    expect(remoto.ActualizadoEnDispositivo).toBe(servicio.actualizadoEn);
    expect(remoto.DispositivoId).toBe(servicio.dispositivoId);
    expect(remoto.UrlCarpetaAdjuntos).toBe(servicio.urlCarpetaAdjuntos);
  });

  it('convierte fechas de solo fecha, lookups, números y Choice', () => {
    const remoto = aCamposSP(servicioCompleto());

    expect(remoto.FechaRecepcion).toBe('2026-10-01T00:00:00Z');
    expect(remoto.FechaEntrega).toBe('2026-10-15T00:00:00Z');
    expect(remoto.FechaAnulacion).toBe('2026-10-20T00:00:00Z');
    expect(remoto.ClienteLookupId).toBe(7);
    expect(remoto.NumeroSolicitud).toBe(1);
    expect(remoto.CotizacionValor).toBe(150_000);
    expect(remoto.OTCostoReparacion).toBe(150_000);
    expect(remoto.Estado).toBe('Facturado');
    expect(remoto.TipoEquipo).toBe('Cargador');
    expect(remoto.CotizacionEstado).toBe('Aprobada');
  });

  it('nunca envía las columnas que escribe Power Automate', () => {
    const claves = Object.keys(aCamposSP(servicioCompleto()));
    expect(claves).not.toContain('OTCorreoEnviado');
    expect(claves).not.toContain('AlertaVidaUtilNivel');
  });

  it('no envía campos solo locales como clienteNombre', () => {
    const remoto = aCamposSP(servicioCompleto());
    expect(remoto).not.toHaveProperty('clienteNombre');
    expect(remoto).not.toHaveProperty('ClienteNombre');
  });

  it('con campos sucios envía solo esos campos más los de sistema', () => {
    const remoto = aCamposSP(servicioCompleto(), ['serie', 'observacionTecnica']);

    expect(remoto.SerieEquipo).toBe('NV4520');
    expect(remoto.ObservacionTecnica).toBe('Se revisa el equipo y se encuentra desgaste interno.');
    expect(remoto.ServicioId).toBeUndefined();
    expect(remoto.Title).toBeUndefined();
    expect(remoto.Estado).toBeUndefined();
    expect(remoto.FechaRecepcion).toBeUndefined();
    expect(remoto.AppVersion).toBe('0.1.0');
    expect(remoto.ActualizadoEnDispositivo).toBeDefined();
    expect(remoto.DispositivoId).toBe('disp-test-1');
  });

  it('no envía Estado mientras el servicio es BORRADOR', () => {
    const borrador = servicioBuilder().borrador().construir();
    expect(aCamposSP(borrador).Estado).toBeUndefined();
  });
});

describe('deCamposSP', () => {
  it('hace ida y vuelta de los campos remotos', () => {
    const servicio = servicioCompleto();
    const local = deCamposSP(aCamposSP(servicio));

    for (const campo of CAMPOS_SERVICIO) {
      if (campo === 'clienteNombre') continue;
      if (servicio[campo] === undefined) continue;
      expect(local[campo], campo).toEqual(servicio[campo]);
    }
  });

  it('recorta las fechas de SharePoint a yyyy-MM-dd', () => {
    expect(deCamposSP({ FechaRecepcion: '2026-10-01T00:00:00Z' }).fechaRecepcion).toBe(
      '2026-10-01'
    );
  });

  it('lee el lookup desde ClienteLookupId o desde ClienteId', () => {
    expect(deCamposSP({ ClienteLookupId: 7 }).clienteId).toBe(7);
    expect(deCamposSP({ ClienteId: 9 }).clienteId).toBe(9);
  });

  it('degrada un Estado desconocido a DESCONOCIDO', () => {
    expect(deCamposSP({ Estado: 'En revisión' }).estado).toBe('DESCONOCIDO');
  });

  it('omite un TipoEquipo o CotizacionEstado desconocidos para conservar el valor local', () => {
    expect(deCamposSP({ TipoEquipo: 'Hidráulico' })).not.toHaveProperty('tipoEquipo');
    expect(deCamposSP({ CotizacionEstado: 'En estudio' })).not.toHaveProperty('cotizacionEstado');
  });

  it('ignora valores nulos o ausentes', () => {
    expect(deCamposSP({ SerieEquipo: null, Marca: undefined })).toEqual({});
  });
});

describe('choices', () => {
  it('mapea códigos a valores visibles de SharePoint', () => {
    expect(codigoAValor('ANULADO', VALOR_ESTADO)).toBe('Anulado');
    expect(codigoAValor('BATERIA', VALOR_TIPO_EQUIPO)).toBe('Batería');
    expect(codigoAValor('RECHAZADA', VALOR_COTIZACION_ESTADO)).toBe('Rechazada');
    expect(codigoAValor('FOTO_SALIDA', VALOR_TIPO_ADJUNTO)).toBe('Foto salida');
    expect(codigoAValor<string>('BORRADOR', VALOR_ESTADO)).toBeUndefined();
  });

  it('reconoce valores visibles sin distinguir mayúsculas, tildes ni espacios', () => {
    expect(valorACodigo('Batería', VALOR_TIPO_EQUIPO)).toBe('BATERIA');
    expect(valorACodigo('  bateria ', VALOR_TIPO_EQUIPO)).toBe('BATERIA');
    expect(valorACodigo('Foto   ingreso', VALOR_TIPO_ADJUNTO)).toBe('FOTO_INGRESO');
    expect(estadoDesdeSharePoint('Disposición final')).toBe('DISPOSICION_FINAL');
    expect(tipoAdjuntoDesdeSharePoint('Formato diagnóstico')).toBe('FORMATO_DIAGNOSTICO');
  });

  it('devuelve undefined cuando el valor no está en el catálogo', () => {
    expect(valorACodigo('Otro', VALOR_TIPO_EQUIPO)).toBeUndefined();
    expect(valorACodigo(undefined, VALOR_TIPO_EQUIPO)).toBeUndefined();
    expect(tipoAdjuntoDesdeSharePoint('Anexo')).toBeUndefined();
  });
});
