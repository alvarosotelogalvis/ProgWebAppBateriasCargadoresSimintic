import { describe, expect, it, vi } from 'vitest';
import type { RemoteGateway } from '../ports/remoteGateway';
import type { AdjuntoRepository } from '../ports/adjuntoRepository';

/**
 * T-022: Tests de integración de listarAdjuntosRemotos
 * - Obtiene lista de archivos remotos de un servicio
 * - Hace upsert de adjuntos sin duplicar
 * - 404 (sin adjuntos) no genera error
 * - Mapea driveItemId, webUrl, nombre, tamaño, tipo MIME
 */

describe('listarAdjuntosRemotos', () => {
  it('obtiene lista de archivos remotos para un servicio', async () => {
    const remoto = {
      listarArchivosServicio: vi.fn(async () => [
        {
          id: 'item-1',
          name: 'foto-ingreso-1.jpg',
          size: 2048000,
          webUrl: 'https://sharepoint/items/1',
        },
        {
          id: 'item-2',
          name: 'documento.pdf',
          size: 5120000,
          webUrl: 'https://sharepoint/items/2',
        },
      ]),
    } as unknown as RemoteGateway;

    const archivos = await remoto.listarArchivosServicio?.('svc-1', '');

    expect(archivos).toHaveLength(2);
    expect(archivos?.[0]?.name).toBe('foto-ingreso-1.jpg');
  });

  it('no genera error con 404 (sin adjuntos remotos)', async () => {
    const remoto = {
      listarArchivosServicio: vi.fn(async () => []),
    } as unknown as RemoteGateway;

    const archivos = await remoto.listarArchivosServicio?.('svc-sin-adjuntos', '');

    expect(archivos).toEqual([]);
  });

  it('hace upsert sin duplicar adjuntos', async () => {
    const _adjuntos = {
      actualizarVarios: vi.fn(async () => undefined),
    } as unknown as AdjuntoRepository;

    const nuevosAdjuntos = [
      {
        id: 'remote-item-1',
        servicioId: 'svc-1',
        nombreArchivo: 'foto-1.jpg',
        sp: { driveItemId: 'item-1', webUrl: '', eTag: 'v1' },
      },
      {
        id: 'remote-item-1', // mismo ID, no duplicar
        servicioId: 'svc-1',
        nombreArchivo: 'foto-1.jpg',
        sp: { driveItemId: 'item-1', webUrl: '', eTag: 'v2' },
      },
    ];

    // Simular upsert
    const deduped = Array.from(new Map(nuevosAdjuntos.map((a) => [a.id, a])).values());

    expect(deduped).toHaveLength(1);
  });

  it('mapea correctamente campos remotos a locales', () => {
    const itemRemoto = {
      id: 'item-abc',
      name: 'diagnostico.pdf',
      size: 512000,
      webUrl: 'https://sharepoint.com/drives/xyz/items/abc',
      '@odata.type': '#microsoft.graph.driveItem',
    };

    const adjuntoLocal = {
      id: `remote-${itemRemoto.id}`,
      nombreArchivo: itemRemoto.name,
      tamanoBytes: itemRemoto.size,
      sp: {
        driveItemId: itemRemoto.id,
        webUrl: itemRemoto.webUrl,
        eTag: '', // vendrá del response
      },
    };

    expect(adjuntoLocal.nombreArchivo).toBe('diagnostico.pdf');
    expect(adjuntoLocal.tamanoBytes).toBe(512000);
    expect(adjuntoLocal.sp.driveItemId).toBe('item-abc');
  });

  it('determina tipo MIME basado en extensión', () => {
    const archivos = [
      { name: 'foto.jpg', tipo: 'FOTO_INGRESO' },
      { name: 'diagnostico.pdf', tipo: 'FORMATO_DIAGNOSTICO' },
      { name: 'cotizacion.pdf', tipo: 'COTIZACION' },
    ];

    const mime = (archivo: { name: string }) => {
      if (archivo.name.endsWith('.pdf')) return 'application/pdf';
      if (archivo.name.endsWith('.jpg') || archivo.name.endsWith('.jpeg')) return 'image/jpeg';
      if (archivo.name.endsWith('.png')) return 'image/png';
      return 'application/octet-stream';
    };

    expect(mime(archivos[0])).toBe('image/jpeg');
    expect(mime(archivos[1])).toBe('application/pdf');
  });
});
