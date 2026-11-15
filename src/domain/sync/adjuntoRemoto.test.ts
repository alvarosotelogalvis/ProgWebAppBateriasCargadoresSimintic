import { describe, expect, it } from 'vitest';

import {
  adjuntoDesdeArchivoRemoto,
  mimeDesdeNombreArchivo,
  tipoDesdeNombreArchivo,
} from './adjuntoRemoto';

describe('tipoDesdeNombreArchivo', () => {
  it.each([
    ['CAR-1-NV4520_FOTO_INGRESO_a1b2c3d4.jpg', 'FOTO_INGRESO'],
    ['BAT-7-X99_FOTO_SALIDA_0000ffff.png', 'FOTO_SALIDA'],
    ['BAT-7-X99_FORMATO_DIAGNOSTICO_abcdef12.pdf', 'FORMATO_DIAGNOSTICO'],
    ['BAT-7-X99_DISPOSICION_FINAL_abcdef12.pdf', 'DISPOSICION_FINAL'],
    ['BAT-7-X99_COTIZACION_abcdef12.pdf', 'COTIZACION'],
    ['BAT-7-X99_FACTURA_abcdef12.pdf', 'FACTURA'],
  ])('%s → %s', (nombre, tipo) => {
    expect(tipoDesdeNombreArchivo(nombre)).toBe(tipo);
  });

  it('no deduce el tipo de un archivo que no sigue la convención', () => {
    expect(tipoDesdeNombreArchivo('foto-del-cliente.jpg')).toBeUndefined();
    expect(tipoDesdeNombreArchivo('CAR-1_FOTO_INGRESO.jpg')).toBeUndefined();
  });
});

describe('mimeDesdeNombreArchivo', () => {
  it('usa la extensión', () => {
    expect(mimeDesdeNombreArchivo('a.JPG')).toBe('image/jpeg');
    expect(mimeDesdeNombreArchivo('a.pdf')).toBe('application/pdf');
    expect(mimeDesdeNombreArchivo('a.xyz')).toBe('application/octet-stream');
  });
});

describe('adjuntoDesdeArchivoRemoto', () => {
  const archivo = {
    id: 'drive-1',
    nombre: 'CAR-1-NV4520_FOTO_INGRESO_a1b2c3d4.jpg',
    tamanoBytes: 2048,
    webUrl: 'https://sp/x',
    eTag: '"e"',
  };

  it('crea un adjunto sincronizado, sin contenido y con los datos remotos', () => {
    const adjunto = adjuntoDesdeArchivoRemoto(archivo, {
      id: 'a-1',
      servicioId: 's-1',
      ahoraIso: '2026-11-07T10:00:00.000Z',
    });

    expect(adjunto).toMatchObject({
      id: 'a-1',
      servicioId: 's-1',
      tipo: 'FOTO_INGRESO',
      nombreArchivo: archivo.nombre,
      mime: 'image/jpeg',
      tamanoBytes: 2048,
      blob: null,
      miniatura: null,
      syncState: 'synced',
      eliminarRemoto: false,
      sp: { driveItemId: 'drive-1', webUrl: 'https://sp/x', eTag: '"e"' },
    });
  });

  it('devuelve undefined si no se puede deducir el tipo', () => {
    expect(
      adjuntoDesdeArchivoRemoto(
        { ...archivo, nombre: 'otro.jpg' },
        { id: 'a', servicioId: 's', ahoraIso: '' }
      )
    ).toBeUndefined();
  });
});
