import { describe, expect, it } from 'vitest';

import { AppError } from '@/shared/errors';

import { nombreArchivo, rutaCarpeta, sanitizarNombreArchivo } from './rutas';

const servicio = {
  id: '5f0c0000-0000-4000-8000-000000000001',
  codigo: 'CAR-1-NV4520',
  fechaRecepcion: '2026-10-01',
};

describe('rutaCarpeta', () => {
  it('usa el año de recepción y el ServicioId', () => {
    expect(rutaCarpeta(servicio)).toBe('2026/5f0c0000-0000-4000-8000-000000000001');
  });

  it('rechaza una fecha de recepción inválida', () => {
    expect(() => rutaCarpeta({ ...servicio, fechaRecepcion: '01/10/2026' })).toThrowError(AppError);
  });
});

describe('nombreArchivo', () => {
  const adjunto = {
    id: 'a1b2c3d4-0000-4000-8000-000000000101',
    tipo: 'FOTO_INGRESO' as const,
    nombreArchivo: 'foto.JPG',
    mime: 'image/jpeg',
  };

  it('es determinista y usa el código, el tipo y 8 caracteres del AdjuntoId', () => {
    expect(nombreArchivo(servicio, adjunto)).toBe('CAR-1-NV4520_FOTO_INGRESO_a1b2c3d4.jpg');
    expect(nombreArchivo(servicio, adjunto)).toBe(nombreArchivo(servicio, adjunto));
  });

  it('conserva la extensión del PDF en minúsculas', () => {
    expect(
      nombreArchivo(servicio, {
        ...adjunto,
        tipo: 'COTIZACION',
        nombreArchivo: 'Cotizacion.PDF',
        mime: 'application/pdf',
      })
    ).toBe('CAR-1-NV4520_COTIZACION_a1b2c3d4.pdf');
  });

  it('deduce la extensión del MIME si el nombre no la tiene', () => {
    expect(nombreArchivo(servicio, { ...adjunto, nombreArchivo: 'foto' })).toBe(
      'CAR-1-NV4520_FOTO_INGRESO_a1b2c3d4.jpg'
    );
  });

  it('sanitiza caracteres no permitidos del código', () => {
    expect(nombreArchivo({ codigo: 'CAR/1:2*3' }, adjunto)).toBe(
      'CAR-1-2-3_FOTO_INGRESO_a1b2c3d4.jpg'
    );
  });
});

describe('sanitizarNombreArchivo', () => {
  it('reemplaza los caracteres prohibidos y colapsa espacios', () => {
    expect(sanitizarNombreArchivo('  a"b*c:d<e>f?g/h\\i|j#k%l  m  ')).toBe(
      'a-b-c-d-e-f-g-h-i-j-k-l m'
    );
  });
});
