import { describe, it, expect } from 'vitest';
import { seleccionarPurgables, puedeEliminarse } from './purgas';
import type { Adjunto } from './adjunto';
import type { Servicio } from './servicio';

describe('purgas', () => {
  describe('puedeEliminarse', () => {
    it('devuelve true para servicios cerrados y sincronizados', () => {
      const servicio: Servicio = {
        id: '123',
        tipoEquipo: 'BATERIA',
        estado: 'FACTURADO',
        syncState: 'synced',
      } as unknown as Servicio;

      expect(puedeEliminarse(servicio)).toBe(true);
    });

    it('devuelve false si syncState no es "synced"', () => {
      const servicio: Servicio = {
        id: '123',
        tipoEquipo: 'BATERIA',
        estado: 'FACTURADO',
        syncState: 'pending',
      } as unknown as Servicio;

      expect(puedeEliminarse(servicio)).toBe(false);
    });

    it('devuelve false si el estado no es cerrado', () => {
      const servicio: Servicio = {
        id: '123',
        tipoEquipo: 'BATERIA',
        estado: 'EN_REPARACION',
        syncState: 'synced',
      } as unknown as Servicio;

      expect(puedeEliminarse(servicio)).toBe(false);
    });

    it('devuelve true para estados cerrados: FACTURADO, ANULADO, DISPOSICION_FINAL', () => {
      const estados = ['FACTURADO', 'ANULADO', 'DISPOSICION_FINAL'] as const;

      for (const estado of estados) {
        const servicio: Servicio = {
          id: '123',
          tipoEquipo: 'BATERIA',
          estado,
          syncState: 'synced',
        } as unknown as Servicio;

        expect(puedeEliminarse(servicio)).toBe(true);
      }
    });
  });

  describe('seleccionarPurgables', () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    it('no incluye servicios con syncState !== "synced"', () => {
      const servicios: Servicio[] = [
        {
          id: 'pending-1',
          estado: 'FACTURADO',
          syncState: 'pending',
          actualizadoEn: new Date(hoy.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(),
        } as unknown as Servicio,
        {
          id: 'error-1',
          estado: 'FACTURADO',
          syncState: 'error',
          actualizadoEn: new Date(hoy.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(),
        } as unknown as Servicio,
      ];

      const resultado = seleccionarPurgables(servicios, new Map());
      expect(resultado.servicios).toHaveLength(0);
      expect(resultado.archivos).toHaveLength(0);
    });

    it('selecciona servicios cerrados que superan el período de retención', () => {
      const servicios: Servicio[] = [
        {
          id: 'facturado-1',
          estado: 'FACTURADO',
          syncState: 'synced',
          actualizadoEn: new Date(hoy.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        } as unknown as Servicio,
      ];

      const resultado = seleccionarPurgables(servicios, new Map(), 7, 3);
      expect(resultado.servicios).toHaveLength(1);
      expect(resultado.servicios[0]?.id).toBe('facturado-1');
    });

    it('no selecciona servicios cerrados que no superan el período de retención', () => {
      const servicios: Servicio[] = [
        {
          id: 'facturado-reciente',
          estado: 'FACTURADO',
          syncState: 'synced',
          actualizadoEn: new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        } as unknown as Servicio,
      ];

      const resultado = seleccionarPurgables(servicios, new Map(), 7, 3);
      expect(resultado.servicios).toHaveLength(0);
    });

    it('selecciona archivos originales que superan retención de días', () => {
      const servicios: Servicio[] = [
        {
          id: 'srv-1',
          estado: 'FACTURADO',
          syncState: 'synced',
          actualizadoEn: new Date(hoy.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        } as unknown as Servicio,
      ];

      const blob = new Blob(['imagen']);
      const adjuntos: Adjunto[] = [
        {
          id: 'adj-1',
          servicioId: 'srv-1',
          tipo: 'FOTO_INGRESO',
          nombreArchivo: 'foto.jpg',
          mime: 'image/jpeg',
          tamanoBytes: 1024,
          sha256: 'abc123',
          capturadoEn: hoy.toISOString(),
          capturadoPor: 'usuario',
          blob,
          miniatura: new Blob(['thumb']),
          syncState: 'synced',
          sincronizadoEn: new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          eliminarRemoto: false,
        } as Adjunto,
      ];

      const map = new Map([['srv-1', adjuntos]]);
      const resultado = seleccionarPurgables(servicios, map, 7, 3);

      expect(resultado.archivos).toHaveLength(1);
      expect(resultado.archivos[0]?.adjunto.id).toBe('adj-1');
    });

    it('no selecciona archivos sin blob original', () => {
      const servicios: Servicio[] = [
        {
          id: 'srv-1',
          estado: 'FACTURADO',
          syncState: 'synced',
        } as unknown as Servicio,
      ];

      const adjuntos: Adjunto[] = [
        {
          id: 'adj-1',
          servicioId: 'srv-1',
          tipo: 'FOTO_INGRESO',
          nombreArchivo: 'foto.jpg',
          mime: 'image/jpeg',
          tamanoBytes: 1024,
          sha256: 'abc123',
          capturadoEn: hoy.toISOString(),
          capturadoPor: 'usuario',
          blob: null,
          miniatura: new Blob(['thumb']),
          syncState: 'synced',
          sincronizadoEn: new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          eliminarRemoto: false,
        } as Adjunto,
      ];

      const map = new Map([['srv-1', adjuntos]]);
      const resultado = seleccionarPurgables(servicios, map, 7, 3);

      expect(resultado.archivos).toHaveLength(0);
    });
  });
});
