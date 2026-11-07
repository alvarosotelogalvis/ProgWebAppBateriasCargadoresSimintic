import { describe, it, expect } from 'vitest';

import { adjuntoMapper } from './adjuntoMapper';

describe('adjuntoMapper (T-007)', () => {
  const servicioId = '00000000-0000-4000-8000-000000000001';

  describe('mapeo de archivos remotos', () => {
    it('mapea un archivo JPEG remoto a adjunto', () => {
      const driveItem = {
        id: 'drive-item-1',
        name: 'foto-ingreso.jpg',
        size: 51200,
        webUrl:
          'https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV/ServiciosAdjuntos/foto-ingreso.jpg',
      };

      const resultado = adjuntoMapper(
        { id: driveItem.id, name: driveItem.name, size: driveItem.size, webUrl: driveItem.webUrl },
        servicioId,
        'FOTO_INGRESO'
      );

      expect(resultado).toMatchObject({
        id: expect.any(String),
        servicioId,
        tipo: 'FOTO_INGRESO',
        nombre: 'foto-ingreso.jpg',
        origen: 'remoto',
        blob: null,
      });
      expect(resultado.tamaño).toBe(51200);
    });

    it('mapea un archivo PDF remoto', () => {
      const driveItem = {
        id: 'drive-item-2',
        name: 'certificado.pdf',
        size: 102400,
        webUrl:
          'https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV/ServiciosAdjuntos/certificado.pdf',
      };

      const resultado = adjuntoMapper(
        { id: driveItem.id, name: driveItem.name, size: driveItem.size, webUrl: driveItem.webUrl },
        servicioId,
        'FORMATO_DIAGNOSTICO'
      );

      expect(resultado.tipo).toBe('FORMATO_DIAGNOSTICO');
      expect(resultado.nombre).toBe('certificado.pdf');
      expect(resultado.origen).toBe('remoto');
    });

    it('crea URLs de thumbnail si están disponibles', () => {
      const driveItem = {
        id: 'drive-item-1',
        name: 'foto.jpg',
        size: 51200,
        webUrl:
          'https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV/ServiciosAdjuntos/foto.jpg',
        thumbnails: [
          {
            small: { url: 'https://empresa.sharepoint.com/thumbnail/small' },
            medium: { url: 'https://empresa.sharepoint.com/thumbnail/medium' },
          },
        ],
      };

      const resultado = adjuntoMapper(driveItem, servicioId, 'FOTO_INGRESO');

      expect(resultado.urlMiniatura).toBe('https://empresa.sharepoint.com/thumbnail/small');
    });
  });

  describe('manejo de errores', () => {
    it('genera un ID único para cada adjunto', () => {
      const driveItem = {
        id: 'drive-item-1',
        name: 'foto.jpg',
        size: 1024,
        webUrl: 'https://ejemplo.com/foto.jpg',
      };

      const res1 = adjuntoMapper(driveItem, servicioId, 'FOTO_INGRESO');
      const res2 = adjuntoMapper(driveItem, servicioId, 'FOTO_INGRESO');

      expect(res1.id).not.toBe(res2.id);
    });
  });
});
